from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand

from merchants.models import Merchant
from products.models import Product
from users.models import StoreUser


class Command(BaseCommand):
    help = '初始化社区商店 MVP 示例数据'

    def handle(self, *args, **options):
        merchant_a, _ = Merchant.objects.get_or_create(
            name='鲜果超市',
            defaults={
                'phone': '020-11110001',
                'address': '幸福社区 1 号楼底商',
                'delivery_note': '2 公里内 30 分钟配送',
                'min_order_amount': 25,
                'delivery_fee': 3,
                'is_open': True
            }
        )

        merchant_b, _ = Merchant.objects.get_or_create(
            name='便民小超',
            defaults={
                'phone': '020-22220002',
                'address': '幸福社区 3 号楼底商',
                'delivery_note': '晚 10 点前配送',
                'min_order_amount': 18,
                'delivery_fee': 2,
                'is_open': True
            }
        )

        products = [
            {
                'merchant': merchant_a,
                'name': '红富士苹果',
                'price': 6.8,
                'unit': '斤',
                'stock': 100,
                'is_active': True,
                'image_url': 'https://dummyimage.com/240x240/ffe4b5/333333&text=苹果',
                'description': '当日新鲜到货，清甜爽口。'
            },
            {
                'merchant': merchant_a,
                'name': '进口香蕉',
                'price': 5.2,
                'unit': '斤',
                'stock': 88,
                'is_active': True,
                'image_url': 'https://dummyimage.com/240x240/fff68f/333333&text=香蕉',
                'description': '口感软糯，适合家庭早餐。'
            },
            {
                'merchant': merchant_b,
                'name': '纯牛奶',
                'price': 12.9,
                'unit': '瓶',
                'stock': 50,
                'is_active': True,
                'image_url': 'https://dummyimage.com/240x240/e0f7ff/333333&text=牛奶',
                'description': '1L 装，冷藏保存。'
            },
            {
                'merchant': merchant_b,
                'name': '鸡蛋',
                'price': 9.8,
                'unit': '盒',
                'stock': -1,
                'is_active': True,
                'image_url': 'https://dummyimage.com/240x240/f5deb3/333333&text=鸡蛋',
                'description': '10 枚/盒，新鲜农场蛋。'
            }
        ]

        for item in products:
            Product.objects.get_or_create(
                merchant=item['merchant'],
                name=item['name'],
                defaults={
                    'price': item['price'],
                    'unit': item['unit'],
                    'stock': item['stock'],
                    'is_active': item['is_active'],
                    'image_url': item['image_url'],
                    'description': item['description']
                }
            )

        StoreUser.objects.get_or_create(
            username='buyer',
            defaults={
                'password': make_password('buyer123'),
                'role': 'buyer',
                'nickname': '社区住户',
                'phone': '13800138000'
            }
        )

        StoreUser.objects.get_or_create(
            username='merchant_fruit',
            defaults={
                'password': make_password('merchant123'),
                'role': 'merchant',
                'nickname': '鲜果超市店主',
                'phone': '13900001111',
                'merchant': merchant_a
            }
        )

        StoreUser.objects.get_or_create(
            username='merchant_market',
            defaults={
                'password': make_password('merchant123'),
                'role': 'merchant',
                'nickname': '便民小超店主',
                'phone': '13900002222',
                'merchant': merchant_b
            }
        )

        self.stdout.write(self.style.SUCCESS('MVP 示例数据初始化完成'))
