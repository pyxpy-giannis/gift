# 小狗窝 🐾

一个只给她用的生日礼物 App：微信风格的情侣空间，做成真正的 Android 安装包。

## 功能

- **情绪安慰**：点「找狗宝」选心情（难过 / 好累 / 有点烦 / 想你），小金毛出来哄她
- **想他的时候**：点「我要找小狗」，会给对方手机发一条 Bark 推送
- **纪念日**：在一起的天数、每 100 天、520 / 888 / 1314、双方生日、春节等节日
- **时光**：点亮的中国地图、城市到访记录、照片、城市插画封面
- **天气**：首页天气与穿衣 / 带伞提醒
- **足迹**：城市页在线地图、景点搜索、地图选点

## 技术栈

- 前端：原生 HTML / CSS / JavaScript，无框架，数据放在 `localStorage`
- 壳：Android `WebView` 加载本地页面，原生 `AlarmManager` 发提醒通知
- 地图：SVG 中国地图 + Leaflet 城市页，DataV 行政区边界
- 推送：Bark（可换成 Server 酱 / PushPlus / 自定义链接）

## 目录

```
app/
  www/                前端页面
    index.html
    css/  js/
    travel-map/       足迹地图（独立页面）
  android/            Android 工程
```

构建时把 `app/www` 整个复制到 `app/android/app/src/main/assets/www`。

## 本地预览

任选一个静态服务器：

```bash
npx serve app/www
# 或
python -m http.server 8000 --directory app/www
```

## 构建 APK

1. 安装 JDK 17、Android SDK 34、Gradle 8.7
2. 复制前端：

```bash
rm -rf app/android/app/src/main/assets/www
mkdir -p app/android/app/src/main/assets
cp -R app/www app/android/app/src/main/assets/www
```

3. 构建：

```bash
cd app/android
gradle assembleRelease
```

4. 产物在 `app/android/app/build/outputs/apk/release/app-release.apk`

仓库里是开源版本，用 debug 签名；正式发布请自己生成 keystore 并配置 `signingConfigs`。

## 需要自己补的东西

- **推送密钥**：在 App 的「我们 → 紧急通知」里填自己的 Bark key，不要提交到仓库
- **贴纸素材**：仓库不含 GIF 表情包，把素材放到 `app/www/assets/stickers/` 即可

## 隐私

所有记录只保存在手机本地，没有服务器、不上传。只有地图瓦片和地名搜索会联网。

## 声明

- 代码以 MIT 协议开源
- 表情包形象版权归原作者，本仓库不包含这些素材，请勿用于商业用途
