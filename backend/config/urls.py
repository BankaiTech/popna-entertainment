from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from accounts.views import LoginView, RefreshView, UserViewSet, logout_view, me_view
from billing.views import BillViewSet, PaymentViewSet
from core.views import dashboard_stats, health
from customers.views import AreaViewSet, CustomerViewSet, PlanViewSet, ProviderViewSet, cutoff_list
from inventory.views import PurchaseViewSet, SaleViewSet, StockItemViewSet, StockUnitViewSet, SupplierViewSet
from notifications.views import SmsLogViewSet
from orgs.views import DistributorViewSet, OrganizationViewSet, distributor_summary
from tracking import views as tracking

router = DefaultRouter(trailing_slash=False)
router.register("users", UserViewSet, basename="user")
router.register("organizations", OrganizationViewSet, basename="organization")
router.register("distributors", DistributorViewSet, basename="distributor")
router.register("areas", AreaViewSet, basename="area")
router.register("plans", PlanViewSet, basename="plan")
router.register("products", ProviderViewSet, basename="product")  # providers; name used by the React app
router.register("contacts", CustomerViewSet, basename="contact")  # name used by the React app
router.register("customers", CustomerViewSet, basename="customer")
router.register("bills", BillViewSet, basename="bill")
router.register("payments", PaymentViewSet, basename="payment")
router.register("sms-logs", SmsLogViewSet, basename="sms-log")
router.register("suppliers", SupplierViewSet, basename="supplier")
router.register("stock-items", StockItemViewSet, basename="stock-item")
router.register("stock-units", StockUnitViewSet, basename="stock-unit")
router.register("purchases", PurchaseViewSet, basename="purchase")
router.register("sales", SaleViewSet, basename="sale")

api = [
    path("health", health),
    path("auth/login", LoginView.as_view()),
    path("auth/refresh", RefreshView.as_view()),
    path("auth/logout", logout_view),
    path("auth/me", me_view),
    path("dashboard/stats", dashboard_stats),
    path("connections/cutoff", cutoff_list),
    path("distributor/summary", distributor_summary),
    path("tracking/status", tracking.duty_status),
    path("tracking/check-in", tracking.check_in),
    path("tracking/check-out", tracking.check_out),
    path("tracking/ping", tracking.ping),
    path("tracking/live", tracking.live),
    path("tracking/route", tracking.route),
    path("", include(router.urls)),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(api)),
]

admin.site.site_header = "LCO Desk admin"
admin.site.site_title = "LCO Desk"
