/* This is a managed file. Do not delete this comment. */

#include <corto/ui/ui.h>
int16_t ui_router_construct(
    ui_router this)
{
    corto_ptr_setstr(&httprouter_Service(this)->path, CORTO_UI_ETC);
    return corto_super_construct(this);
}

corto_string ui_router_home(
    ui_router this,
    httpserver_HTTP_Request *request,
    ui_home *data)
{
    return httprouter_route_defaultAction(ui_router_home_o, this, request);
}

corto_string ui_router_res(
    ui_router this,
    httpserver_HTTP_Request *request,
    ui_res *data)
{
    return httprouter_route_fileAction(ui_router_res_o, this, request, data->path, data->file);
}

