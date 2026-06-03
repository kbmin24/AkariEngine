<template>
    <div id="pageTools" class="w0auto mt-2" role="group">
        <NuxtLink :to="`/w/${pagename}`" class="btn btn-slideopen">문서</NuxtLink>
        <NuxtLink :to="`/edit/${pagename}`" class="btn btn-slideopen" rel="nofollow">편집</NuxtLink>
        <a class="btn btn-outline-primary dropdown-toggle" style="-webkit-appearance: none;"
           role="button" id="pageToolsDropdown"
           data-bs-toggle="dropdown" aria-expanded="false">더보기</a>
        <ul class="dropdown-menu dropdown-menu-macos shadow dropdown-menu-end"
            aria-labelledby="pageToolsDropdown">
            <li><NuxtLink :to="`/xref/${pagename}`" class="dropdown-item" rel="nofollow">역링크</NuxtLink></li>
            <li><NuxtLink :to="`/threads/${pagename}`" class="dropdown-item" rel="nofollow">토론</NuxtLink></li>
            <li><NuxtLink :to="`/history/${pagename}`" class="dropdown-item" rel="nofollow">역사</NuxtLink></li>
            <li><NuxtLink :to="`/move/${pagename}`" class="dropdown-item" rel="nofollow">이동</NuxtLink></li>
            <li><NuxtLink :to="`/protect/${pagename}`" class="dropdown-item" rel="nofollow">보호</NuxtLink></li>
            <li><NuxtLink :to="`/delete/${pagename}`" class="dropdown-item" rel="nofollow">삭제</NuxtLink></li>
        </ul>
    </div>
</template>

<script setup>
defineProps({
    pagename: { type: String, required: true },
})
</script>
