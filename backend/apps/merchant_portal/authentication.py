"""
Custom authentication for Merchant Portal.
"""
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from users.models import Merchant


class MerchantJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that sets merchant on request.
    """
    
    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None
        
        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None
        
        validated_token = self.get_validated_token(raw_token)
        
        # Get merchant_id from token
        merchant_id = validated_token.get('merchant_id')
        if not merchant_id:
            raise InvalidToken('Token does not contain merchant_id')
        
        try:
            merchant = Merchant.objects.get(id=merchant_id)
        except Merchant.DoesNotExist:
            raise InvalidToken('Merchant not found')
        
        # Set merchant on request
        request.merchant = merchant
        
        return (None, validated_token)  # Return None for user, token for validation

