<template lang="pug">
section.ip-projects
    .ip-container.ip-dfw
        RouterLink.ip-project(v-for="item in list" :to="'/project/' + item.id")
            img(:src="'data:image;base64,' + item.logo")
            h4 {{ item.title }}
</template>

<script setup lang="ts">
    interface Props {
        list: any[]
    }
    const {list} = defineProps<Props>()
    
    
</script>

<style scoped lang="scss">
.ip-projects {
    width: 100%;

    .ip-project {
        width: calc(20% - 8px);
        text-align: center;
        background-color: transparent;
        padding: 10px;

        &:hover {
            background-color: rgb(187 187 187 / 60%);

            img {
                filter: grayscale(0);
            }

            // h4 {
            //     // color: #fff;
            // }
        }

        img {
            max-width: 100%;
            width: 200px;
            height: 200px;
            object-fit: contain;
            filter: grayscale(1);
            transition: all .2s ease;
        }

        h4 {
            font-size: 24px;
            font-weight: 600;
            color: black;
        }
    }
}

@media (max-width: 576px) {
    .ip-projects {
        .ip-project {
            width: 100%;
        }
    }
}
</style>