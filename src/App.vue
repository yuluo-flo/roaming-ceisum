<template>
  <div id="cesiumContainer">
  </div>
  <button @click="toBegin" style="position: absolute;top: 20px;left: 20px;">开始</button>
</template>

<script setup>
import * as Cesium from 'cesium'
import { onMounted } from 'vue';
import modifyMap from './tool/filterColor'
import roadData from './assets/load.json'
import { getSiteTimes, getSampleData, spaceDistance } from './tool/trajectory.js'

Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIzN2I5MjZlMi1hNWVmLTRiMTYtYmQ1Zi02ZTZhYTIzODMxNGQiLCJpZCI6MjMyMzU4LCJpYXQiOjE3MjI2NDgwNjZ9.6fr9IMMqrH44vakpvWGtA0rr1M9iHaRIoowp3VYRF9s'

let viewer

onMounted(() => {
  const layer = new Cesium.UrlTemplateImageryProvider({
    url: "http://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}",
    minimumLevel: 4,
    maximumLevel: 18,
  });

  viewer = new Cesium.Viewer('cesiumContainer', {
    imageryProvider: layer,
    animation: true,
    timeline: false,
    fullscreenButton: false,
    homeButton: false
  })
  console.log(viewer);
  // 底图滤色
  modifyMap(viewer, {
    invertColor: true,
    filterRGB: [70, 110, 120]
  })
  initData()
})

let busEntity
const toBegin = () => {
  const { timeSum, times } = getSiteTimes(Cesium.Cartesian3.fromDegreesArray(roadArr), 20)
  // 将一个标准的 JavaScript Date 对象转换为一个 Cesium 的 JulianDate 对象
  const start = Cesium.JulianDate.fromDate(new Date(2015, 2, 25, 16))
  // 用于将一个指定的秒数添加到 JulianDate 对象上
  const stop = Cesium.JulianDate.addSeconds(
    start,
    timeSum,
    new Cesium.JulianDate()
  )
  console.log(stop,'stop');
  // 设置动画开始、结束时间以及地图当前时间，其类型是一个JulianDate，因此需要先实例化JulianDate出来
  viewer.clock.startTime = start.clone()
  viewer.clock.stopTime = stop.clone()
  viewer.clock.currentTime = start.clone()

  // 获取公交车随时间变化的位数数据，是SampledPositionProperty类型
  const position = getSampleData(Cesium.Cartesian3.fromDegreesArray(roadArr), start, times)
  // 创建添加公交车模型实体
  busEntity = viewer.entities.add({
    availability:new Cesium.TimeIntervalCollection([
      new Cesium.TimeInterval({
        start:start,
        stop:stop
      })
    ]),
    position: position,
    model: {
      uri: '/src/assets/bus.gltf',
      minimumPixelSize: 40,
      scale: 1.2
    },
    orientation: new Cesium.VelocityOrientationProperty(position)
  })
  // 跟踪实体
  viewer.trackedEntity = busEntity
  viewer.clock.onTick.addEventListener(tickEventHandler)
  console.log(viewer.clock);
}

let index = 1
const tickEventHandler = () => {
  // 返回实时位置
  //  SampledPositionProperty具有getValue方法 传入时间 返回相应位置             
  const carPosition = busEntity.position.getValue(viewer.clock.currentTime)
  // 计算车辆位置点与站台间的距离
  const stationPosition = Cesium.Cartesian3.fromDegrees(...roadData.stations[index].xy_coords.split(';').map(item => { return Number(item) }))
  console.log(stationPosition);
  const distance = spaceDistance(carPosition, stationPosition)
  console.log(distance);
  if (distance < 10) {
    index++
    // 时间停止
    viewer.clock.shouldAnimate = false
    // 开启定时器
    setTimeout(() => {
      viewer.clock.shouldAnimate = true
    }, 1500)
  }
}

let roadArr = []
// 初始化地图
const initData = () => {
  // 公交线路的添加
  const longitudeArr = roadData.xs.split(',').map((item) => { return Number(item) })
  const latitudeArr = roadData.ys.split(',').map((item) => { return Number(item) })
  longitudeArr.forEach((item, index) => {
    roadArr.push(item, latitudeArr[index])
  });
  const roadEntity = new Cesium.Entity({
    name: 'road',
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArray(roadArr),
      width: 10,
      material: Cesium.Color.WHITE.withAlpha(0.8),
      clampToGround: true//贴地
    },
  })
  viewer.entities.add(roadEntity)
  viewer.zoomTo(roadEntity)
  // 公交站点的添加
  roadData.stations.forEach((item, index) => {
    const position = item.xy_coords.split(';').map(item => { return Number(item) })
    const positionLabel = Cesium.Cartesian3.fromDegrees(...position, 24)
    // 设置实体方向
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(
      Cesium.Cartesian3.fromDegrees(...position),
      Cesium.HeadingPitchRoll.fromDegrees(90, 0, 0)
    )
    viewer.entities.add({
      name: 'station',
      position: Cesium.Cartesian3.fromDegrees(...position),
      orientation,
      model: {
        uri: '/src/assets/model.gltf',
        scale: 0.07,
        // 最小像素尺寸，而不考虑地图缩放
        minimumPixelSize: 30
      },
      // 
      // label: {
      //   text: item.name,
      //   font:'10px sans-serif',
      //   showBackground: true,
      //   backgroundColor: Cesium.Color.BLACK,
      //   // pixelOffset是二维的偏移，即上下左右，并不能实现所谓的悬浮效果；因此不使用组合实体
      //   pixelOffset:new Cesium.Cartesian2(0,-15),
      // }
    })
    viewer.entities.add({
      id: 'label' + index,
      position: positionLabel,
      label: {
        text: item.name,
        font: '10px sans-serif',
        fillColor: Cesium.Color.WHITE,
        showBackground: true,
        backgroundColor: Cesium.Color.BLACK.withAlpha(0.5)
      }
    })
  })
}

</script>

<style scoped>
#cesiumContainer {
  width: 100vw;
  height: 100vh;
}
</style>