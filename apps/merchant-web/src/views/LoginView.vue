<template>
	<div class="login-page" data-testid="web-login-page">
		<div class="login-brand">
			<div class="login-brand-icon">🏪</div>
			<h1 class="login-brand-title">社区商店</h1>
			<p class="login-brand-subtitle">商家管理平台</p>
		</div>

		<el-card data-testid="web-login-card">
			<div class="login-tabs">
				<button class="login-tab" :class="{ active: activeTab === 'login' }" @click="activeTab = 'login'">
					商家登录
				</button>
				<button class="login-tab" :class="{ active: activeTab === 'register' }" @click="activeTab = 'register'">
					商家入驻
				</button>
			</div>

			<!-- 登录表单 -->
			<div v-show="activeTab === 'login'">
				<span data-testid="web-login-title" style="display: none">登录</span>
				<el-form :model="form" label-width="80px" data-testid="web-login-form" @submit.prevent>
					<el-form-item label="用户名">
						<el-input v-model="form.username" data-testid="web-login-username" placeholder="merchant_fruit" />
					</el-form-item>
					<el-form-item label="密码">
						<el-input v-model="form.password" data-testid="web-login-password" type="password" show-password />
					</el-form-item>
					<el-form-item>
						<el-button
							type="primary"
							data-testid="web-login-submit"
							:loading="submitting"
							style="width: 100%"
							@click="submitLogin"
							>登录</el-button
						>
					</el-form-item>
				</el-form>
			</div>

			<!-- 入驻表单 -->
			<div v-show="activeTab === 'register'">
				<el-form :model="registerForm" label-width="96px" @submit.prevent>
					<el-form-item label="店铺名称">
						<el-input v-model="registerForm.merchant_name" data-testid="web-register-merchant-name" />
					</el-form-item>
					<el-form-item label="登录用户名">
						<el-input v-model="registerForm.username" data-testid="web-register-username" />
					</el-form-item>
					<el-form-item label="登录密码">
						<el-input
							v-model="registerForm.password"
							type="password"
							show-password
							data-testid="web-register-password"
						/>
					</el-form-item>
					<el-form-item label="联系人">
						<el-input v-model="registerForm.nickname" data-testid="web-register-nickname" />
					</el-form-item>
					<el-form-item label="联系电话">
						<el-input v-model="registerForm.phone" data-testid="web-register-phone" />
					</el-form-item>
					<el-form-item label="店铺地址">
						<el-input v-model="registerForm.address" data-testid="web-register-address" />
					</el-form-item>
					<el-form-item label="配送说明">
						<el-input v-model="registerForm.delivery_note" data-testid="web-register-delivery-note" />
					</el-form-item>
					<el-form-item label="起送价">
						<el-input-number v-model="registerForm.min_order_amount" :min="0" :step="1" />
					</el-form-item>
					<el-form-item label="配送费">
						<el-input-number v-model="registerForm.delivery_fee" :min="0" :step="1" />
					</el-form-item>
					<el-form-item>
						<el-button
							type="success"
							data-testid="web-register-submit"
							:loading="submittingRegister"
							style="width: 100%"
							@click="submitRegister"
							>提交入驻并登录</el-button
						>
					</el-form-item>
				</el-form>
			</div>
		</el-card>
	</div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { merchantService } from '../services/merchant-service'

const router = useRouter()
const activeTab = ref<'login' | 'register'>('login')
const submitting = ref(false)
const submittingRegister = ref(false)
const form = reactive({
	username: 'merchant_fruit',
	password: 'merchant123',
})
const registerForm = reactive({
	merchant_name: '',
	username: '',
	password: '',
	nickname: '',
	phone: '',
	address: '',
	delivery_note: '',
	min_order_amount: 0,
	delivery_fee: 0,
})

async function submitLogin(): Promise<void> {
	if (!form.username || !form.password) {
		ElMessage.error('请输入账号密码')
		return
	}

	submitting.value = true
	try {
		const user = await merchantService.login(form)
		if (user.role !== 'merchant') {
			ElMessage.error('当前账号不是商家角色')
			return
		}
		ElMessage.success('登录成功')
		router.push('/dashboard')
	} catch (error) {
		ElMessage.error((error as Error).message)
	} finally {
		submitting.value = false
	}
}

async function submitRegister(): Promise<void> {
	if (
		!registerForm.merchant_name.trim() ||
		!registerForm.username.trim() ||
		!registerForm.password ||
		!registerForm.nickname.trim() ||
		!registerForm.phone.trim() ||
		!registerForm.address.trim()
	) {
		ElMessage.error('请填写完整入驻信息')
		return
	}

	submittingRegister.value = true
	try {
		await merchantService.registerMerchant({
			merchant_name: registerForm.merchant_name.trim(),
			username: registerForm.username.trim(),
			password: registerForm.password,
			nickname: registerForm.nickname.trim(),
			phone: registerForm.phone.trim(),
			address: registerForm.address.trim(),
			delivery_note: registerForm.delivery_note.trim(),
			min_order_amount: Number(registerForm.min_order_amount),
			delivery_fee: Number(registerForm.delivery_fee),
			is_open: true,
		})
		ElMessage.success('入驻成功，已自动登录')
		router.push('/dashboard')
	} catch (error) {
		ElMessage.error((error as Error).message)
	} finally {
		submittingRegister.value = false
	}
}
</script>
