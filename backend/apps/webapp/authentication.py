"""
Custom authentication for Customer Portal (WebApp).
"""
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from customers.models import Customer


class CustomerJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that sets customer on request.
    """
    
    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None
        
        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None
        
        try:
            validated_token = self.get_validated_token(raw_token)
        except Exception:
            # Token validation failed, let other auth classes try
            return None
        
        # Get customer_id from token
        customer_id = validated_token.get('customer_id')
        if not customer_id:
            # No customer_id in token, let other auth classes try
            return None
        
        try:
            customer = Customer.objects.get(id=customer_id)
        except Customer.DoesNotExist:
            # Customer not found, fail authentication
            raise InvalidToken('Customer not found')
        
        # Set customer on request
        request.customer = customer
        
        # Return a dummy user object with id attribute for compatibility
        # This allows IsAuthenticated permission to work
        class DummyUser:
            def __init__(self, customer_id):
                self.id = customer_id
                self.is_authenticated = True
        
        return (DummyUser(customer_id), validated_token)

