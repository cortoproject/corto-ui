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
