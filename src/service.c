/* This is a managed file. Do not delete this comment. */

#include <corto/ui/ui.h>
int16_t ui_service_construct(
    ui_service this)
{
    corto_set_str(&httprouter_service(this)->path, CORTO_UI_ETC);
    return corto_super_construct(this);
}

corto_string ui_service_home(
    ui_service this,
    httpserver_HTTP_Request *request,
    ui_home *data)
{
    return httprouter_route_defaultAction(ui_service_home_o, this, request);
}

corto_string ui_service_res(
    ui_service this,
    httpserver_HTTP_Request *request,
    ui_res *data)
{
    return httprouter_route_fileAction(
        ui_service_res_o, this, request, data->path, data->file);
}

corto_string ui_service_plugin(
    ui_service this,
    httpserver_HTTP_Request *request,
    ui_plugin *data)
{
    char *plugin_name = corto_asprintf("driver/ui/%s", data->path);

    /* Remove extension */
    char *ext = strrchr(plugin_name, '.');
    if (ext) {
        *ext = '\0';
    }

    /* Lookup package etc directory */
    const char *etc = corto_locate(plugin_name, NULL, CORTO_LOCATE_ETC);
    if (!etc) {
        corto_warning("plugin '%s' not found", plugin_name);
        httpserver_HTTP_Request_setStatus(request, 404);
        return NULL;
    }

    free(plugin_name);
    corto_info("returning plugin in '%s'", etc);
    return httprouter_route_fileAction(
        ui_service_plugin_o,
        this,
        request,
        etc,
        "plugin.js");
}

corto_string ui_service_app(
    ui_service this,
    httpserver_HTTP_Request *request,
    ui_app *data)
{
    /* Redirect to path with slash at the end */
    if (request->uri[strlen(request->uri) - 1] != '/') {
        httpserver_HTTP_Request_setStatus(request, 301);
        httpserver_HTTP_Request_setHeader(request, "Location", strarg(
            "%s/", request->uri
        ));
        return NULL;
    } else {
        return httprouter_route_defaultAction(ui_service_app_o, this, request);
    }
}

corto_string ui_service_app_files(
    ui_service this,
    httpserver_HTTP_Request *request,
    ui_app_files *data)
{
    httpserver_HTTP_Request r = *request;
    r.uri = request->uri + 5; /* Strip '/app/' */
    r.uri = strchr(r.uri, '/');
    corto_assert(r.uri != NULL, "uri does not have plugin encoded");
    httprouter_service_forward(this, &r, r.uri);
    return NULL;
}
