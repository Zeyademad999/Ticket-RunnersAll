"""
URLs for WebApp Portal (User-Facing).
"""
from django.urls import path
from . import views

urlpatterns = [
    # Authentication
    path('users/register/', views.user_register, name='user-register'),
    path('users/verify-otp/', views.user_verify_otp, name='user-verify-otp'),
    path('users/login/', views.user_login, name='user-login'),
    path('users/verify-login-otp/', views.user_verify_login_otp, name='user-verify-login-otp'),
    path('users/me/', views.user_me, name='user-me'),
    path('users/profile/', views.user_profile_update, name='user-profile-update'),
    path('users/forgot-password/request-otp/', views.user_forgot_password_request_otp, name='user-forgot-password-request-otp'),
    path('users/reset-password/', views.user_reset_password, name='user-reset-password'),
    
    # Public Events
    path('public/events/', views.public_events_list, name='public-events-list'),
    path('public/events/featured/', views.public_events_featured, name='public-events-featured'),
    path('public/events/categories/', views.public_events_categories, name='public-events-categories'),
    path('public/events/<uuid:event_id>/', views.public_event_detail, name='public-event-detail'),
    path('public/organizers/<uuid:organizer_id>/', views.public_organizer_detail, name='public-organizer-detail'),
    path('public/venues/', views.public_venues_list, name='public-venues-list'),
    
    # Tickets
    path('tickets/book/', views.ticket_book, name='ticket-book'),
    path('users/tickets/', views.user_tickets_list, name='user-tickets-list'),
    path('users/tickets/<uuid:ticket_id>/', views.user_ticket_detail, name='user-ticket-detail'),
    path('users/tickets/<uuid:ticket_id>/transfer/', views.user_ticket_transfer, name='user-ticket-transfer'),
    path('users/tickets/<uuid:ticket_id>/gift/', views.user_ticket_gift, name='user-ticket-gift'),
    path('users/tickets/<uuid:ticket_id>/qr-code/', views.user_ticket_qr_code, name='user-ticket-qr-code'),
    path('users/tickets/<uuid:ticket_id>/refund-request/', views.user_refund_request, name='user-ticket-refund-request'),
    path('users/events/<uuid:event_id>/checkin-status/', views.user_event_checkin_status, name='user-event-checkin-status'),
    
    # Payments
    path('payments/process/', views.payment_process, name='payment-process'),
    path('payments/confirm/', views.payment_confirm, name='payment-confirm'),
    path('payments/<uuid:transaction_id>/status/', views.payment_status, name='payment-status'),
    path('invoices/<uuid:transaction_id>/', views.invoice_download, name='invoice-download'),
    path('users/payment-history/', views.user_payment_history, name='user-payment-history'),
    
    # NFC Cards
    path('users/nfc-cards/', views.user_nfc_cards_list, name='user-nfc-cards-list'),
    path('users/nfc-cards/request/', views.user_nfc_card_request, name='user-nfc-card-request'),
    path('users/nfc-cards/<uuid:card_id>/reload/', views.user_nfc_card_reload, name='user-nfc-card-reload'),
    path('users/nfc-cards/<uuid:card_id>/transactions/', views.user_nfc_card_transactions, name='user-nfc-card-transactions'),
    path('users/nfc-cards/<uuid:card_id>/auto-reload-settings/', views.user_nfc_card_auto_reload_settings, name='user-nfc-card-auto-reload-settings'),
    
    # Dependents
    path('users/dependents/', views.user_dependents, name='user-dependents'),
    path('users/dependents/<uuid:dependent_id>/', views.user_dependent_detail, name='user-dependent-detail'),
    
    # Favorites
    path('users/favorites/', views.user_favorites, name='user-favorites'),
    path('users/favorites/<uuid:event_id>/', views.user_favorites, name='user-favorite-delete'),
    
    # Analytics
    path('users/analytics/', views.user_analytics, name='user-analytics'),
    
    # Check-in
    path('checkin/verify/', views.checkin_verify, name='checkin-verify'),
    path('checkin/nfc/', views.checkin_nfc, name='checkin-nfc'),
]

