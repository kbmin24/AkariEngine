<template>
    <footer id="footer" class="bg-light text-center p-3 mt-auto">
        <div>Powered by <NuxtLink to="/Licence">AkariEngine</NuxtLink></div>
        <div>본 웹사이트의 내용은 별도로 명시된 경우를 제외하고 {{ config.public.licence }} 라이선스 하에 배포됩니다.</div>
        <div>Contents are licensed under {{ config.public.licence }} unless otherwise specified.</div>
    </footer>
</template>

<script setup>
const config = useRuntimeConfig()
</script>
