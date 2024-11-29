import * as Cesium from 'cesium'

const getSiteTimes = (pArr,speed)=>{
    let timeSum  = 0//花费的时间总数，
    let times = []//每一个轨迹点对应的时间
    for(let i = 0;i<pArr.length;i++){
        if(i==0){
            times.push(0)
            continue
        }
        timeSum += spaceDistance(pArr[i-1],pArr[i])/speed
        times.push(timeSum)
    }
    // 更加语义化
    return {
        timeSum:timeSum,
        times:times
    }
}

const spaceDistance = (a,b)=>{
    // 求两个笛卡尔坐标间距离 保留两位小数位
    return Cesium.Cartesian3.distance(a,b).toFixed(2)
}

const getSampleData = (pArr,start,siteTime)=>{
    // 用于表示随时间变化的位置数据
    const position = new Cesium.SampledPositionProperty()
    for(let i =0;i<pArr.length;i++){
        const time = Cesium.JulianDate.addSeconds(
            start,
            siteTime[i],
            new Cesium.JulianDate()
          )
        position.addSample(time,pArr[i])
    }
    console.log(position);
    return position
}

export {getSiteTimes,getSampleData,spaceDistance}