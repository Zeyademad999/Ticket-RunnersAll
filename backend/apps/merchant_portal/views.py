"""
Views for Merchant Portal.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from django.db.models import Q
import hashlib
import secrets

from users.models import Merchant
from nfc_cards.models import NFCCard
from customers.models import Customer
from core.otp_service import create_and_send_otp, verify_otp
from core.exceptions import AuthenticationError, ValidationError
from core.permissions import IsMerchant
from .serializers import (
    MerchantLoginSerializer, MerchantOTPSerializer,
    MerchantProfileSerializer, CardAssignmentSerializer,
    CustomerVerificationSerializer, CustomerOTPRequestSerializer,
    NFCCardSerializer, MerchantSettingsSerializer
)


@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])  # Skip authentication for login endpoint
def merchant_login(request):
    """
    Merchant login endpoint.
    POST /api/merchant/login/
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Log request details
    logger.info("=" * 80)
    logger.info("MERCHANT LOGIN REQUEST RECEIVED")
    logger.info(f"Request method: {request.method}")
    logger.info(f"Request path: {request.path}")
    logger.info(f"Request user: {request.user}")
    logger.info(f"Request authenticated: {request.user.is_authenticated if hasattr(request.user, 'is_authenticated') else 'N/A'}")
    logger.info(f"Request data: {request.data}")
    logger.info(f"Request data type: {type(request.data)}")
    logger.info(f"Request data keys: {list(request.data.keys()) if hasattr(request.data, 'keys') else 'N/A'}")
    logger.info(f"Request headers: {dict(request.headers) if hasattr(request, 'headers') else 'N/A'}")
    logger.info("=" * 80)
    
    serializer = MerchantLoginSerializer(data=request.data)
    if not serializer.is_valid():
        logger.error(f"Serializer validation failed: {serializer.errors}")
        logger.error(f"Received data: mobile={request.data.get('mobile')}, password={'***' if request.data.get('password') else 'None'}")
        raise ValidationError(serializer.errors)
    
    mobile = serializer.validated_data['mobile']
    password = serializer.validated_data['password']
    
    logger.info(f"Looking for merchant with mobile: '{mobile}' (length: {len(mobile)})")
    logger.info(f"Mobile repr: {repr(mobile)}")
    
    try:
        merchant = Merchant.objects.get(mobile_number=mobile)
        logger.info(f"Merchant found: ID={merchant.id}, Status={merchant.status}, HasPassword={bool(merchant.password)}")
        logger.info(f"Stored mobile: '{merchant.mobile_number}' (length: {len(merchant.mobile_number)})")
        logger.info(f"Mobile match: {merchant.mobile_number == mobile}")
    except Merchant.DoesNotExist:
        logger.warning(f"Merchant not found for mobile: '{mobile}'")
        # Try to find similar mobile numbers for debugging
        similar = Merchant.objects.filter(mobile_number__icontains=mobile[:5])[:5]
        logger.warning(f"Similar mobile numbers found: {[m.mobile_number for m in similar]}")
        raise AuthenticationError("Invalid mobile number or password")
    
    password_check = merchant.check_password(password)
    logger.info(f"Password check result: {password_check}")
    logger.info(f"Password provided length: {len(password)}")
    
    if not password_check:
        logger.warning(f"Password check failed for merchant ID={merchant.id}")
        raise AuthenticationError("Invalid mobile number or password")
    
    if merchant.status != 'active':
        logger.warning(f"Merchant status is '{merchant.status}', not 'active'")
        raise AuthenticationError("Your account is not active")
    
    # Create and send OTP
    logger.info(f"Attempting to send OTP to mobile: {mobile}")
    otp, success = create_and_send_otp(mobile, 'login', app_name="TicketRunners Merchant")
    logger.info(f"OTP send result: success={success}, otp={'***' if otp else 'None'}")
    
    # If OTP was created, allow user to proceed even if SMS status is unclear
    # The OTP is stored in database and can be verified regardless of SMS API response
    if otp is None:
        logger.error(f"Failed to create OTP for mobile: {mobile}")
        return Response({
            'error': {
                'code': 'OTP_SEND_FAILED',
                'message': 'Failed to create OTP. Please try again.'
            }
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    if not success:
        # OTP was created but SMS status indicates failure
        # Log warning but still allow user to proceed since OTP exists in database
        logger.warning(f"OTP created for mobile {mobile} but SMS status indicates failure. OTP code: {otp.code if otp else 'N/A'}")
        logger.warning(f"User can still verify OTP since it exists in database")
    
    logger.info(f"OTP sent successfully to mobile: {mobile}")
    return Response({
        'message': 'OTP sent to your mobile number',
        'mobile': mobile
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def merchant_verify_otp(request):
    """
    Verify OTP and return JWT tokens.
    POST /api/merchant/verify-otp/
    """
    serializer = MerchantOTPSerializer(data=request.data)
    if not serializer.is_valid():
        raise ValidationError(serializer.errors)
    
    mobile = serializer.validated_data['mobile']
    otp_code = serializer.validated_data['otp_code']
    
    if not verify_otp(mobile, otp_code, 'login'):
        raise AuthenticationError("Invalid or expired OTP")
    
    try:
        merchant = Merchant.objects.get(mobile_number=mobile)
    except Merchant.DoesNotExist:
        raise AuthenticationError("Merchant not found")
    
    # Update last login
    merchant.last_login = timezone.now()
    merchant.save(update_fields=['last_login'])
    
    # Create refresh token
    refresh = RefreshToken()
    refresh['merchant_id'] = str(merchant.id)
    refresh['mobile'] = mobile
    
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'merchant': MerchantProfileSerializer(merchant).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsMerchant])
def merchant_logout(request):
    """
    Merchant logout endpoint.
    POST /api/merchant/logout/
    """
    try:
        refresh_token = request.data.get('refresh_token')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)
    except Exception:
        return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsMerchant])
def merchant_me(request):
    """
    Get current merchant profile.
    GET /api/merchant/me/
    """
    merchant = request.merchant
    serializer = MerchantProfileSerializer(merchant)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsMerchant])
def merchant_dashboard_stats(request):
    """
    Get merchant dashboard statistics.
    GET /api/merchant/dashboard-stats/
    """
    merchant = request.merchant
    
    cards = NFCCard.objects.filter(merchant=merchant)
    
    stats = {
        'available_cards': cards.filter(status='active', customer__isnull=True).count(),
        'delivered_cards': cards.filter(status='active', delivered_at__isnull=False).count(),
        'assigned_cards': cards.filter(status='active', assigned_at__isnull=False).count(),
        'total_cards': cards.count(),
    }
    
    # Recent activity (last 10 card assignments)
    recent_activity = cards.filter(assigned_at__isnull=False).order_by('-assigned_at')[:10]
    activity_data = []
    for card in recent_activity:
        activity_data.append({
            'card_serial': card.serial_number,
            'customer_name': card.customer.name if card.customer else 'N/A',
            'customer_mobile': card.customer.mobile_number if card.customer else 'N/A',
            'assigned_at': card.assigned_at,
            'delivered_at': card.delivered_at,
        })
    
    stats['recent_activity'] = activity_data
    
    return Response(stats, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsMerchant])
def merchant_assign_card(request):
    """
    Assign card to customer (multi-step workflow).
    POST /api/merchant/assign-card/
    """
    serializer = CardAssignmentSerializer(data=request.data)
    if not serializer.is_valid():
        raise ValidationError(serializer.errors)
    
    merchant = request.merchant
    card_serial = serializer.validated_data['card_serial']
    customer_mobile = serializer.validated_data['customer_mobile']
    
    try:
        card = NFCCard.objects.get(serial_number=card_serial, merchant=merchant)
    except NFCCard.DoesNotExist:
        return Response({
            'error': {'code': 'CARD_NOT_FOUND', 'message': 'Card not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    try:
        customer = Customer.objects.get(mobile_number=customer_mobile)
    except Customer.DoesNotExist:
        return Response({
            'error': {'code': 'CUSTOMER_NOT_FOUND', 'message': 'Customer not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check if customer is registered (fees are paid in person to merchant, no check needed)
    if customer.status != 'active':
        return Response({
            'error': {'code': 'CUSTOMER_INACTIVE', 'message': 'Customer account is not active'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Send OTP to customer
    otp, success = create_and_send_otp(customer_mobile, 'customer_verification', app_name="TicketRunners")
    
    if not success:
        return Response({
            'error': {'code': 'OTP_SEND_FAILED', 'message': 'Failed to send OTP to customer'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response({
        'message': 'OTP sent to customer mobile',
        'card_serial': card_serial,
        'customer_mobile': customer_mobile
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsMerchant])
def merchant_verify_customer_otp(request):
    """
    Verify customer OTP and complete card assignment.
    POST /api/merchant/verify-customer-otp/
    """
    merchant = request.merchant
    card_serial = request.data.get('card_serial')
    customer_mobile = request.data.get('customer_mobile')
    otp_code = request.data.get('otp_code')
    
    if not all([card_serial, customer_mobile, otp_code]):
        raise ValidationError("card_serial, customer_mobile, and otp_code are required")
    
    # Verify OTP
    if not verify_otp(customer_mobile, otp_code, 'customer_verification'):
        raise AuthenticationError("Invalid or expired OTP")
    
    try:
        card = NFCCard.objects.get(serial_number=card_serial, merchant=merchant)
        customer = Customer.objects.get(mobile_number=customer_mobile)
    except (NFCCard.DoesNotExist, Customer.DoesNotExist):
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Card or customer not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Generate hashed code for card writing
    hashed_code = hashlib.sha256(f"{card.serial_number}{customer.id}{timezone.now()}".encode()).hexdigest()
    
    # Assign card - set issue date to now, expiry to 1 year from issue
    from datetime import timedelta
    issue_date = timezone.now().date()
    expiry_date = issue_date + timedelta(days=365)  # 1 year from issue date
    
    card.customer = customer
    card.merchant = merchant
    card.assigned_at = timezone.now()
    card.issue_date = issue_date
    card.expiry_date = expiry_date
    card.hashed_code = hashed_code
    card.status = 'active'
    card.save()
    
    return Response({
        'message': 'Card assigned successfully',
        'hashed_code': hashed_code,
        'card': NFCCardSerializer(card).data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsMerchant])
def merchant_cards_list(request):
    """
    List merchant's cards.
    GET /api/merchant/cards/
    """
    merchant = request.merchant
    cards = NFCCard.objects.filter(merchant=merchant).select_related('customer')
    
    # Filtering
    status_filter = request.query_params.get('status')
    search = request.query_params.get('search')
    
    if status_filter:
        cards = cards.filter(status=status_filter)
    if search:
        cards = cards.filter(
            Q(serial_number__icontains=search) |
            Q(customer__mobile_number__icontains=search)
        )
    
    serializer = NFCCardSerializer(cards, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET', 'PUT'])
@permission_classes([IsMerchant])
def merchant_settings(request):
    """
    Get or update merchant settings.
    GET /api/merchant/settings/
    PUT /api/merchant/settings/
    """
    merchant = request.merchant
    
    if request.method == 'GET':
        serializer = MerchantSettingsSerializer(merchant)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    # PUT - Update settings
    serializer = MerchantSettingsSerializer(merchant, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    raise ValidationError(serializer.errors)


@api_view(['POST'])
@permission_classes([IsMerchant])
def merchant_change_password(request):
    """
    Change merchant password.
    POST /api/merchant/change-password/
    """
    merchant = request.merchant
    
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')
    confirm_password = request.data.get('confirm_password')
    
    if not all([current_password, new_password, confirm_password]):
        raise ValidationError("All fields are required")
    
    if new_password != confirm_password:
        raise ValidationError("New passwords do not match")
    
    if not merchant.check_password(current_password):
        raise AuthenticationError("Current password is incorrect")
    
    merchant.set_password(new_password)
    merchant.save()
    
    return Response({'message': 'Password changed successfully'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsMerchant])
def merchant_change_mobile(request):
    """
    Request mobile number change.
    POST /api/merchant/change-mobile/
    """
    merchant = request.merchant
    new_mobile = request.data.get('new_mobile')
    
    if not new_mobile:
        raise ValidationError("new_mobile is required")
    
    # Send OTP to new mobile
    otp, success = create_and_send_otp(new_mobile, 'mobile_change', app_name="TicketRunners Merchant")
    
    if not success:
        return Response({
            'error': {'code': 'OTP_SEND_FAILED', 'message': 'Failed to send OTP'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response({
        'message': 'OTP sent to new mobile number',
        'new_mobile': new_mobile
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsMerchant])
def merchant_verify_mobile_change(request):
    """
    Verify mobile change OTP and update mobile.
    POST /api/merchant/verify-mobile-change/
    """
    merchant = request.merchant
    new_mobile = request.data.get('new_mobile')
    otp_code = request.data.get('otp_code')
    
    if not all([new_mobile, otp_code]):
        raise ValidationError("new_mobile and otp_code are required")
    
    if not verify_otp(new_mobile, otp_code, 'mobile_change'):
        raise AuthenticationError("Invalid or expired OTP")
    
    merchant.mobile_number = new_mobile
    merchant.save(update_fields=['mobile_number'])
    
    return Response({
        'message': 'Mobile number updated successfully',
        'mobile': new_mobile
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsMerchant])
def merchant_verify_customer(request, mobile):
    """
    Verify customer separately (check registration & fees).
    GET /api/merchant/verify-customer/:mobile/
    """
    merchant = request.merchant
    
    try:
        customer = Customer.objects.get(mobile_number=mobile)
    except Customer.DoesNotExist:
        return Response({
            'error': {'code': 'CUSTOMER_NOT_FOUND', 'message': 'Customer not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    data = {
        'id': customer.id,
        'name': customer.name,
        'mobile_number': customer.mobile_number,
        'email': customer.email,
        'status': customer.status,
        'fees_paid': customer.fees_paid,
        'is_registered': True,
        'can_assign_card': customer.status == 'active'  # Fees paid in person, no check needed
    }
    
    return Response(data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsMerchant])
def merchant_send_customer_otp(request):
    """
    Send OTP to customer separately.
    POST /api/merchant/send-customer-otp/
    """
    merchant = request.merchant
    customer_mobile = request.data.get('customer_mobile')
    
    if not customer_mobile:
        raise ValidationError("customer_mobile is required")
    
    try:
        customer = Customer.objects.get(mobile_number=customer_mobile)
    except Customer.DoesNotExist:
        return Response({
            'error': {'code': 'CUSTOMER_NOT_FOUND', 'message': 'Customer not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    if customer.status != 'active':
        return Response({
            'error': {'code': 'CUSTOMER_INACTIVE', 'message': 'Customer account is not active'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Fees are paid in person to merchant, no check needed
    otp, success = create_and_send_otp(customer_mobile, 'customer_verification', app_name="TicketRunners")
    
    if not success:
        return Response({
            'error': {'code': 'OTP_SEND_FAILED', 'message': 'Failed to send OTP to customer'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response({
        'message': 'OTP sent to customer mobile',
        'customer_mobile': customer_mobile
    }, status=status.HTTP_200_OK)
