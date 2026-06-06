<template>
    <nav class="navbar navbar-dark bg-primary fixed-top">
        <div class="container-fluid nav-contents">
            <NuxtLink class="navbar-brand" to="/">{{ config.public.appname }}</NuxtLink>

            <ul class="navbar-nav me-auto mb-lg-0" style="flex-direction: row;">
                <li class="nav-item">
                    <NuxtLink class="nav-link" to="/RecentChanges">
                        <i class="fas fa-sync-alt nav-icon"></i>
                        <span class="d-none d-lg-inline">{{ $t('recentChanges') }}</span>
                    </NuxtLink>
                </li>
                <li class="nav-item">
                    <NuxtLink class="nav-link" to="/RecentDiscuss">
                        <i class="fa fa-comments nav-icon"></i>
                        <span class="d-none d-lg-inline">{{ $t('recentDiscuss') }}</span>
                    </NuxtLink>
                </li>
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" role="button"
                       data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="fas fa-cog"></i>
                        <span class="d-none d-lg-inline">{{ $t('tools') }}</span>
                    </a>
                    <ul class="dropdown-menu dropdown-menu-macos shadow" style="position: absolute;">
                        <li>
                            <NuxtLink class="dropdown-item" to="/RandomPage">
                                <i class="fa fa-random nav-icon"></i> {{ $t('randomPage') }}
                            </NuxtLink>
                        </li>
                        <li>
                            <NuxtLink class="dropdown-item" to="/PageList">
                                <i class="fa fa-list-ul nav-icon"></i> {{ $t('pageList') }}
                            </NuxtLink>
                        </li>
                        <li>
                            <NuxtLink class="dropdown-item" to="/orphaned">
                                <i class="fa fa-link nav-icon"></i> {{ $t('orphaned_pages') }}
                            </NuxtLink>
                        </li>
                        <li>
                            <NuxtLink class="dropdown-item" to="/Upload">
                                <i class="fa fa-upload nav-icon"></i> {{ $t('upload') }}
                            </NuxtLink>
                        </li>
                        <li>
                            <NuxtLink class="dropdown-item" to="/adminlog">
                                <i class="fa fa-history nav-icon"></i> {{ $t('adminLog') }}
                            </NuxtLink>
                        </li>
                        <li>
                            <NuxtLink class="dropdown-item" to="/viewrank">
                                <i class="fa fa-chart-line nav-icon"></i> {{ $t('viewRank') }}
                            </NuxtLink>
                        </li>
                        <li>
                            <NuxtLink class="dropdown-item" to="/Licence">
                                <i class="fa fa-check nav-icon"></i> {{ $t('licence') }}
                            </NuxtLink>
                        </li>
                    </ul>
                </li>
            </ul>

            <div class="navbar-nav" id="userIcon">
                <div class="dropdown">
                    <button class="btn" id="navUserDropDown"
                            data-bs-toggle="dropdown" aria-expanded="false">
                        <i v-if="store.isLoggedIn" class="fas fa-user-circle text-light fa-lg"></i>
                        <i v-else class="fas fa-sign-in-alt text-light"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end position-absolute dropdown-menu-macos mx-0 shadow"
                        aria-labelledby="navUserDropDown">
                        <li class="userButton_username">
                            {{ store.username ?? store.ipAddress }}
                        </li>
                        <li><hr class="dropdown-divider"></li>
                        <li v-if="store.isLoggedIn">
                            <NuxtLink class="dropdown-item" :to="`/w/User:${store.username}`">사용자 문서</NuxtLink>
                        </li>
                        <li>
                            <NuxtLink class="dropdown-item"
                                      :to="`/contribution/${store.username ?? store.ipAddress}`">기여 목록</NuxtLink>
                        </li>
                        <hr style="margin: 0.3rem 0;">
                        <li>
                            <NuxtLink class="dropdown-item" to="/settings">설정</NuxtLink>
                        </li>
                        <li v-if="store.isAdmin">
                            <NuxtLink class="dropdown-item" to="/admin">관리 메뉴</NuxtLink>
                        </li>
                        <hr style="margin: 0.3rem 0;">
                        <li>
                            <NuxtLink v-if="store.isLoggedIn" class="dropdown-item" to="/logout">로그아웃</NuxtLink>
                            <NuxtLink v-else class="dropdown-item" to="/login">로그인</NuxtLink>
                        </li>
                    </ul>
                </div>
            </div>

            <form class="input-group d-flex" id="searchBox" role="search" @submit.prevent="onSearch">
                <input class="form-control" v-model="searchQuery" id="searchinput" type="search"
                       :placeholder="$t('search')" :aria-label="$t('search')" required>
                <button class="btn btn-outline-light bg-primary" id="searchSubmit" type="submit">
                    <i class="fa fa-arrow-right text-light"></i>
                </button>
            </form>
        </div>
    </nav>
</template>

<script setup>
const config = useRuntimeConfig()
const store = useUserStore()
const router = useRouter()

const searchQuery = ref('')

const onSearch = () => {
    if (searchQuery.value.trim()) {
        router.push(`/search?q=${encodeURIComponent(searchQuery.value.trim())}`)
        searchQuery.value = ''
    }
}
</script>
