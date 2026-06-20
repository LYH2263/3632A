from django.test import TestCase
from rest_framework.test import APIClient

from merchants.models import Merchant
from users.models import StoreUser


class UserApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_merchant_success(self):
        response = self.client.post(
            '/api/v1/auth/register-merchant',
            {
                'username': 'merchant_new',
                'password': 'merchant123',
                'nickname': '新商家店主',
                'phone': '13900003333',
                'merchant_name': '新开社区店',
                'address': '幸福社区 5 号楼',
                'delivery_note': '晚 9 点前配送',
                'min_order_amount': 20,
                'delivery_fee': 3
            },
            format='json'
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['data']['user']['role'], 'merchant')
        self.assertTrue(Merchant.objects.filter(name='新开社区店').exists())
        self.assertTrue(StoreUser.objects.filter(username='merchant_new').exists())

    def test_register_merchant_duplicate_username(self):
        merchant = Merchant.objects.create(
            name='已有商家',
            phone='020-11110001',
            address='幸福社区 1 号楼',
            delivery_note='随时配送',
            min_order_amount=10,
            delivery_fee=2,
            is_open=True
        )
        StoreUser.objects.create(
            username='merchant_existing',
            password='merchant123',
            role='merchant',
            nickname='已有店主',
            phone='13900001111',
            merchant=merchant
        )

        response = self.client.post(
            '/api/v1/auth/register-merchant',
            {
                'username': 'merchant_existing',
                'password': 'merchant123',
                'nickname': '重复用户',
                'phone': '13900009999',
                'merchant_name': '重复店',
                'address': '幸福社区 9 号楼'
            },
            format='json'
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('username', response.data)
