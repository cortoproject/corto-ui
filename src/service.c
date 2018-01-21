/* This is a managed file. Do not delete this comment. */

#include <corto/ui/ui.h>
int16_t ui_service_construct(
    ui_service this)
{
    corto_set_str(&httprouter_Service(this)->path, CORTO_UI_ETC);
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
    return httprouter_route_fileAction(ui_service_res_o, this, request, data->path, data->file);
}

corto_string ui_service_plugin(
    ui_service this,
    httpserver_HTTP_Request *request,
    ui_plugin *data)
{
    char *plugin_name = corto_asprintf("driver/ui/%s", data->file);

    printf("PLUGIN: %s\n", plugin_name);

    /* Remove extension */
    char *ext = strrchr(plugin_name, '.');
    if (ext) {
        *ext = '\0';
    }

    /* Lookup package etc directory */
    char *etc = corto_locate(plugin_name, NULL, CORTO_LOCATION_ETC);
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
