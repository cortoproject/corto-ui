
if (!corto) {
   var corto = {};
   corto.subscribers = {};
   corto.metadata = {};
   corto.retryConnection = undefined;
}

corto.retryPeriod = 100;
corto.retries = 0;

// Message classes
corto.msg_connect = function() {
  this.type = "ws/connect";
  this.value = {};
  this.value.version = "1.0";
}

corto.msg_subscribe = function(id, parent, expr, type, offset, limit, summary) {
  this.type = "ws/sub";
  this.value = {};
  this.value.id = id;
  this.value.parent = parent;
  this.value.expr = expr;
  this.value.type = type;
  this.value.offset = offset;
  this.value.limit = limit;
  this.value.summary = summary;
}

corto.msg_unsubscribe = function(id) {
  this.type = "ws/unsub";
  this.value = {};
  this.value.id = id;
}

corto.msg_update = function(id, value) {
  this.type = "ws/update";
  this.value = {};
  this.value.id = id;
  this.value.v = value;
}

corto.msg_delete = function(id) {
  this.type = "ws/delete";
  this.value = {};
  this.value.id = id;
}

// Subscriber class
corto.subscriber = function(db, parent, expr, type, offset, limit, onUpdate, onDelete, onError) {
  this.parent = parent;
  this.expr = expr;
  this.type = type;
  this.offset = offset;
  this.limit = limit
  this.db = db;
  this.enabled = false;
  this.onUpdate = onUpdate;
  this.onDelete = onDelete;
  this.onError = onError;

  this.findType = function(id) {
    return this.db.find(function(elem) {
      return elem.id == id;
    });
  }
}

// Type class
corto.type = function(kind) {
  this.kind = kind;
  this.isPrimitive = function() {
    return !["struct", "class", "container", "table", "leaf", "procedure", "union", "array", "sequence", "list", "map"].includes(this.kind);
  }
  this.isComposite = function() {
    return ["struct", "class", "container", "table", "leaf", "procedure", "union"].includes(this.kind);
  }
  this.isCollection = function() {
    return ["array", "sequence", "list", "map"].includes(this.kind);
  }
}

// Get member from a value
corto.getMember = function(value, index) {
  orig = value;
  if (value instanceof Array) {
    for (var i = 0; i < index.length; i ++) {
      if (value != undefined) {
        value = value[index[i]];
      } else {
        console.log(
          "error: failed to parse '" + JSON.stringify(orig) + "' with index '" + JSON.stringify(index) + "'");
        break;
      }
    }
  }
  return value;
}

// Object class
corto.object = function(id, value) {
  this.id = id;
  this.value = value;

  this.getMember = function(index) {
    return corto.getMember(this.value, index);
  }
}

corto.connected = function(msg) {
  if (corto.onConnected != undefined) corto.onConnected(msg);
}

// Expand members of composite values into headers that describe scalar values
corto.expandMembers = function(dataType, type, index, prefix, rows) {
  var count = 0;

  if (!type.members) {
      return 0;
  }

  for (var i = 0; i < type.members.length; i++) {
    var member = type.members[i];

    // member[0] = member name
    // member[1] = member type
    // member[2] = member metadata (modifiers, tags, units)

    var key = member[0];
    var memberType = corto.metadata[member[1]]; // Lookup type in client type db
    var meta = member[2];

    var isBase = key == "super";
    if (!memberType) {
      count ++;
      continue;
    }

    var memberName;
    if (prefix) {
      // If function is called recursively, prefix contains parent member expr
      memberName = prefix + "." + key;
    } else {
      memberName = key;
    }

    if (!isBase) {
      // Count is the index at which the member can be found. The base member
      // ('super') is not counted.
      index.push(count);
    }

    var m_readonly = false;
    var m_const = false
    var m_key = false;
    var m_optional = false;
    var unit = undefined;
    var tags = undefined;

    if (meta != undefined) {
        // Parse modifiers
        if (meta.m) {
            m_key = meta.m.includes("k");
            m_readonly = meta.m.includes("r");
            m_const = meta.m.includes("c");
            m_optional = meta.m.includes("o");
        }
        unit = meta.u;
        tags = meta.t;
    }

    var elem = {
      name: memberName,
      rowName: key,
      typeName: member[1],
      index: function(index) {
        var r = [];
        for (var i = 0; i < index.length; i++) {
          r.push(index[i]);
        }
        return r;
      } (index), // Deep copy index. Index tells headers where to find member value in an object
      type: memberType,
      m_readonly: m_readonly,
      m_const: m_const,
      m_key: m_key,
      m_optional: m_optional,
      unit: unit,
      tags: tags,
      rows: []
    };

    rows.push(elem);
    if (memberType.isComposite() && (!memberType.reference || key == "super")) {
      var result = corto.expandMembers(dataType, memberType, index, isBase ? undefined : memberName, elem.rows);
      if (isBase) {
        count += result - 1;
      }
    } else {
      dataType.headers.push(elem);
      if (memberType.isCollection() && !memberType.reference) {
        corto.buildTypeHeaders(elem, memberType.elementType);
      }
    }

    if (!isBase) {
      index.pop();
    }
    count ++;
  }

  return count;
}

corto.buildTypeHeaders = function(dataType, type) {
  if (!dataType.headers) {
    dataType.headers = [];
    dataType.rows = [];

    if (type == undefined) {
      type = corto.metadata[dataType.id];
    }

    if (type == undefined) {
      console.error("type with id " + dataType.id + " not found");
    }

    if (type.isComposite()) {
      // Create headers for each member of a composite type
      corto.expandMembers(dataType, type, [], undefined, dataType.rows);
    } else {
      // If not a composite type, just create a single 'value' column
      var elem = {
        name: "value",
        index: [0],
        type: type,
        rows: []
      };
      dataType.headers.push(elem);
      dataType.rows.push(elem);
    }
  }
}

corto.insert = function(msg) {
  if (msg.value.sub in corto.subscribers) {
    subscriber = corto.subscribers[msg.value.sub];

    // This ensures messages from a previous subscriber with the same name will
    // be rejected.
    if (!subscriber.enabled) {
      return;
    }

    // Iterate all the types in the message with corresponding objects
    for (var i = 0; i < msg.value.data.length; i++) {
      var msgDataType = msg.value.data[i];

      // Find object storage for type in subscriber
      var subDataType = subscriber.findType(msgDataType.type)
      if (!subDataType) {
        subDataType = {
          id: msgDataType.type,
          objects: []
        };
        subscriber.db.push(subDataType);
      }

      // If kind is set, the message contains a description of the type as
      // opposed to just the name of the type. Copy the contents of the type
      // into the type db of the client.
      if (msgDataType.kind) {
        var type = new corto.type(msgDataType.kind);
        if (msgDataType.members) {
          type.members = msgDataType.members;
        }
        if (msgDataType.constants) {
          type.constants = msgDataType.constants;
        }
        if (msgDataType.reference == true) {
          type.reference = true;
        } else {
          type.reference = false;
        }

        // Assign the type to the type db (not subscriber specific)
        corto.metadata[msgDataType.type] = type;
        if (msgDataType.elementType) {
          type.elementType = corto.metadata[msgDataType.elementType];
        }
      }

      // If message contains set member, create/update objects
      if (msgDataType.set) {
        for (var j = 0; j < msgDataType.set.length; j++) {
          o = msgDataType.set[j];
          id = o.id;
          if (o.p) {
            id = o.p + "/" + id;
          }
          subObject = subDataType.objects.find(function(elem) {
            return elem.id == id;
          });
          if (!subObject) {
            subObject = new corto.object(id, o.v);
            subDataType.objects.push(subObject);

            if (subscriber.onDefine) {
              subscriber.onDefine(subObject);
            }
          } else {
            if (subscriber.onUpdate) {
              subscriber.onUpdate(subObject);
            }
          }

          subObject.value = o.v;
          subObject.readonly = false;
          subObject.invalid = false;

          if (o.a) { /* Check if object contains attributes */
            if (o.a.includes("r")) {
              subObject.readonly = true;
            }
            if (o.a.includes("i")) {
              subObject.invalid = true;
            }
          }
        }
      }

      // If message contains del member, delete objects
      if (msgDataType.del) {
        for(var obj = 0; obj < subDataType.objects.length; obj++) {
          for (var j = 0; j < msgDataType.del.length; j++) {
            o = msgDataType.del[j];
            id = o.id;
            if (o.p) {
              id = o.p + "/" + id;
            }

            if(subDataType.objects[obj].id === id) {
              if (subscriber.onDelete) {
                subscriber.onDelete(subDataType.objects[obj]);
              }
              subDataType.objects.splice(obj, 1);
            }
          }
        }
      }
    }

    // After all objects and types have been inserted, it is guaranteed that client
    // has a complete picture of all types. Now build the header caches. Header
    // caches expand nested composite members until a list of headers is created
    // where each column represents a scalar value.
    for (var i = 0; i < subscriber.db.length; i ++) {
      if (subscriber.db[i]) {
        corto.buildTypeHeaders(subscriber.db[i]);
      }
    }
  }
}

corto.subok = function(msg) {
  if (msg.value.id in corto.subscribers) {
    subscriber = corto.subscribers[msg.value.id];
    subscriber.enabled = true;
  }
}

corto.subfail = function(msg) {
  if (msg.value.id in corto.subscribers) {
    subscriber = corto.subscribers[msg.value.id];
    if (subscriber.onError) {
      if (subscriber.instance) {
        subscriber.onError(subscriber.instance, msg.value.error);
      } else {
        subscriber.onError(msg.value.error);
      }
    }
  }
  delete corto.subscribers[msg.value.id];
}

corto.recv_handlers = {
  "/corto/ws/connected": function(msg) { corto.connected(msg) },
  "/corto/ws/data": function(msg) { corto.insert(msg) },
  "/corto/ws/subok": function(msg) { corto.subok(msg) },
  "/corto/ws/subfail": function(msg) { corto.subfail(msg) }
}

corto.recv = function(msg) {
  corto.recv_handlers[msg.type](msg);
}

corto.send = function(msg) {
  this.ws.send(JSON.stringify(msg));
}

corto.connectToWs = function(host, onOpen, onError, onClose) {
    corto.ws = new WebSocket("ws://" + host);

    corto.ws.onopen = function(ev) {
      corto.retryConnection = undefined;
      if (onOpen != undefined) onOpen();
      corto.send(new corto.msg_connect());
    };
    corto.ws.onerror = function(ev) {
      if (onError != undefined) onError();
    };
    corto.ws.onclose = function(ev) {
      if (corto.host == host) {
        if (!corto.retryConnection) {
          if (onClose != undefined) onClose();
        }
        if (corto.retries < 10) {
          corto.retries ++;
        }
        corto.retryConnection = setTimeout(function() {
          corto.connectToWs(host, onOpen, onError, onClose);
        }, corto.retryPeriod * corto.retries);
      }
    };
    corto.ws.onmessage = function(ev) {
      var msg = JSON.parse(ev.data);
      if (msg) {
        corto.recv(msg);
      }
    }
}

corto.connect = function(params) {
  var host = params.host;
  var onConnected = params.onConnected;
  var onOpen = params.onOpen;
  var onError = params.onError;
  var onClose = params.onClose;

  corto.retries = 0;

  if (corto.retryConnection) {
    clearTimeout(corto.retryConnection);
  }

  if (corto.ws && corto.ws.readyState != 3 && corto.host != host) {
    var ws = corto.ws;
    corto.ws = undefined;
    ws.close();
  }

  corto.retryConnection = undefined;

  this.host = host;
  this.onConnected = onConnected;
  corto.connectToWs(host, onOpen, onError, onClose);
}

corto.subscribe = function(params) {
  var id = params.id;
  var parent = params.parent;
  var expr = params.expr;
  var type = params.type;
  var offset = params.offset;
  var limit = params.limit;
  var db = params.db;
  var onDefine = params.onDefine;
  var onUpdate = params.onUpdate;
  var onDelete = params.onDelete;
  var onError = params.onError;
  var summary = params.summary;
  corto.send(new corto.msg_subscribe(id, parent, expr, type, offset, limit, summary));
  corto.subscribers[id] = new corto.subscriber(db, parent, expr, type, offset, limit, onUpdate, onDelete, onError);
}

corto.unsubscribe = function(params) {
  var id = params.id;
  if (corto.subscribers[id]) {
    corto.send(new corto.msg_unsubscribe(id));
    corto.subscribers[id].enabled = false;
    var db = corto.subscribers[id].db;
    db.splice(0,db.length);
    delete corto.subscribers[id];
  }
}

corto.update = function(params) {
  var id = params.id;
  var value = params.value;
  corto.send(new corto.msg_update(id, value));
}

corto.delete = function(params) {
  var id = params.id;
  corto.send(new corto.msg_delete(id));
}

corto.parseQuery = function(query) {
  var re = /select ([\*\.a-zA-Z0-9_\~\^\|\&\-\/\\]+) *(from ([\*\.a-zA-Z0-9_\~\-\/\\]+))? *(type ([\*\.a-zA-Z0-9_\^\|\&\~\-\/\\]+))?/;
  var matches = query.match(re);
  if (matches) {
    return {
      select: matches[1],
      from: matches[3],
      type: matches[5]
    };
  } else {
    return {}
  }
}
