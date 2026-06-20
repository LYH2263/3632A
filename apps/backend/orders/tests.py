from django.test import TestCase
from rest_framework.test import APIClient

from merchants.models import Merchant
from products.models import Product
from users.models import StoreUser
from .models import Order


class OrderApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.merchant = Merchant.objects.create(
            name='鲜果超市',
            phone='020-11110001',
            address='幸福社区 1 号楼底商',
            delivery_note='2 公里内 30 分钟配送',
            min_order_amount=20,
            delivery_fee=3,
            is_open=True
        )

        self.buyer = StoreUser.objects.create(
            username='buyer',
            password='buyer123',
            role='buyer',
            nickname='社区住户',
            phone='13800138000'
        )

        self.merchant_user = StoreUser.objects.create(
            username='merchant_fruit',
            password='merchant123',
            role='merchant',
            nickname='店主',
            phone='13900001111',
            merchant=self.merchant
        )

        self.product = Product.objects.create(
            merchant=self.merchant,
            name='苹果',
            price=10,
            unit='斤',
            stock=10,
            is_active=True,
            image_url='https://dummyimage.com/240x240/ffe4b5/333333&text=苹果',
            description='测试商品'
        )

    def test_login_success(self):
        response = self.client.post(
            '/api/v1/auth/login',
            {'username': 'buyer', 'password': 'buyer123'},
            format='json'
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['data']['user']['role'], 'buyer')

    def test_create_order_success(self):
        response = self.client.post(
            '/api/v1/orders',
            {
                'buyer_id': self.buyer.id,
                'merchant_id': self.merchant.id,
                'receiver_name': '测试用户',
                'receiver_phone': '13800138000',
                'receiver_address': '幸福社区 8 栋',
                'remark': '请尽快配送',
                'cart_items': [
                    {
                        'product_id': self.product.id,
                        'quantity': 2
                    }
                ]
            },
            format='json'
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['data']['status'], 'pending')
        self.assertEqual(response.data['data']['pay_method'], 'offline')
        self.assertEqual(len(response.data['data']['items_snapshot']), 1)

    def test_create_order_invalid_quantity(self):
        response = self.client.post(
            '/api/v1/orders',
            {
                'buyer_id': self.buyer.id,
                'merchant_id': self.merchant.id,
                'receiver_name': '测试用户',
                'receiver_phone': '13800138000',
                'receiver_address': '幸福社区 8 栋',
                'cart_items': [
                    {
                        'product_id': self.product.id,
                        'quantity': 0
                    }
                ]
            },
            format='json'
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)

    def test_status_transition(self):
        order = Order.objects.create(
            buyer=self.buyer,
            merchant=self.merchant,
            order_no='CS202501010000000001',
            status='pending',
            pay_method='offline',
            receiver_name='测试用户',
            receiver_phone='13800138000',
            receiver_address='幸福社区 8 栋',
            items_amount=20,
            delivery_fee=3,
            total_amount=23,
            items_snapshot=[
                {
                    'product_id': self.product.id,
                    'name': '苹果',
                    'unit': '斤',
                    'price': 10,
                    'quantity': 2,
                    'subtotal': 20
                }
            ]
        )

        response = self.client.patch(
            f'/api/v1/orders/{order.id}/status',
            {'status': 'confirmed'},
            format='json',
            HTTP_AUTHORIZATION=f'Bearer django-token-{self.merchant_user.id}'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['data']['status'], 'confirmed')

        response = self.client.patch(
            f'/api/v1/orders/{order.id}/status',
            {'status': 'completed'},
            format='json',
            HTTP_AUTHORIZATION=f'Bearer django-token-{self.merchant_user.id}'
        )
        self.assertEqual(response.status_code, 400)

    def test_status_transition_forbidden_for_non_merchant(self):
        order = Order.objects.create(
            buyer=self.buyer,
            merchant=self.merchant,
            order_no='CS202501010000000002',
            status='pending',
            pay_method='offline',
            receiver_name='测试用户',
            receiver_phone='13800138000',
            receiver_address='幸福社区 8 栋',
            items_amount=20,
            delivery_fee=3,
            total_amount=23,
            items_snapshot=[]
        )

        response = self.client.patch(
            f'/api/v1/orders/{order.id}/status',
            {'status': 'confirmed'},
            format='json',
            HTTP_AUTHORIZATION=f'Bearer django-token-{self.buyer.id}'
        )
        self.assertEqual(response.status_code, 403)
