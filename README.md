# Projection Face WebGL

リアルタイムで地図投影法を画像に適用できる WebGL ベースの可視化ツール。

## 特徴

- 🚀 **リアルタイムレンダリング**: WebGL 2.0 による GPU 並列処理で 60fps 実現
- 🗺️ **8種類の投影法対応**: Mercator、Stereographic、Equal Earth、Mollweide、Azimuthal Equidistant、Orthographic、Gnomonic、Natural Earth
- 📸 **複数入力対応**: ファイルアップロード、Webカメラ、サンプル画像
- 🌐 **多言語対応**: 日本語・英語
- 📱 **レスポンシブデザイン**: デスクトップ・モバイル対応

## 技術スタック

- **WebGL 2.0**: GPU 描画
- **Vanilla JavaScript**: フレームワーク不要
- **GLSL**: 投影法計算
- **CSS Grid/Flexbox**: レスポンシブレイアウト

## セットアップ

### 必要環境
- Modern browser with WebGL 2.0 support (Chrome, Firefox, Safari, Edge)
- Python 3.x (開発サーバー用)

### インストール

```bash
git clone https://github.com/n1n9-jp/projection-face-webgl.git
cd projection-face-webgl
```

### 開発サーバー起動

```bash
npm start
# または
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000` にアクセスしてください。

## 使い方

### 画像入力
1. **ファイルアップロード**: 「画像をアップロード」をクリック、またはドラッグ&ドロップ
2. **Webカメラ**: 「Webカメラを開く」をクリック、フレームをキャプチャ
3. **サンプル画像**: ドロップダウンからサンプル画像を選択

### 投影法選択
ヘッダーの投影法セレクタから投影法を選択します。投影法を切り替えると、地理座標レベルでブレンディングされた滑らかなアニメーション（1秒間、easeInOutBackイージング）で遷移します。

### パラメータ調整
サイドバーのスライダーで以下を調整：
- **スケール**: 投影法のスケール（50～500）
- **回転 X (経度)**: 東西方向の回転（-180°～180°）
- **回転 Y (緯度)**: 南北方向の回転（-90°～90°）

### キーボードショートカット
- `Ctrl/Cmd + R`: パラメータをリセット
- `Ctrl/Cmd + S`: スクリーンショット（PNG）を保存
- `Ctrl/Cmd + O`: ファイルを開く
- `Esc`: 画像をクリア

## ファイル構造

```
projection-face-webgl/
├── index.html                 # メインページ
├── css/
│   └── style.css              # スタイル（レスポンシブデザイン）
├── js/
│   ├── app.js                 # メインアプリケーション
│   ├── webgl-renderer.js      # WebGL 描画エンジン
│   ├── projections.js         # 投影法管理
│   ├── ui-controls.js         # UI 制御
│   ├── input-handler.js       # 入力処理
│   └── language-manager.js    # 多言語対応
├── samples/                   # サンプル画像
│   ├── lena.png               # テスト画像
│   └── self.png               # 顔写真
├── package.json               # プロジェクト設定
└── README.md                  # このファイル
```

## 投影法の説明

| 投影法 | 分類 | 特性 | 用途 |
|--------|------|------|------|
| Mercator | 正角図法 | 角度保持、高緯度で面積拡大 | Web地図の標準 |
| Stereographic | 正角図法 | 角度保持、放射状の歪み | 極地表示 |
| Equal Earth | 正積図法 | 面積保持、自然な見え方 | 面積比較 |
| Mollweide | 正積図法 | 面積保持、楕円形 | 全世界表示 |
| Azimuthal Equidistant | 正距図法 | 中心からの距離保持 | 距離測定 |
| Orthographic | 透視図法 | 宇宙から見た地球 | 3D 表現 |
| Gnomonic | 透視図法 | 大圏航路が直線 | 航海・航空 |
| Natural Earth | 妥協図法 | バランス重視 | 一般的な地図 |

## パフォーマンス

- **フレームレート**: 60fps（1920×1080 以下）
- **メモリ使用量**: 最小限（GPU メモリのみ）
- **レンダリング時間**: < 16ms per frame

## ブラウザ対応

| ブラウザ | バージョン | 対応状況 |
|---------|-----------|--------|
| Chrome | 最新版 | ✅ 完全対応 |
| Firefox | 最新版 | ✅ 完全対応 |
| Safari | 15+ | ✅ 完全対応 |
| Edge | 最新版 | ✅ 完全対応 |
| iOS Safari | 15+ | ✅ 対応 |
| Android Chrome | 最新版 | ✅ 対応 |

## 開発

### フェーズ

1. **フェーズ1**: プロジェクト基盤構築 ✅ 完了
2. **フェーズ2**: WebGL 基盤構築 ✅ 完了
3. **フェーズ3**: 投影法実装（GLSL シェーダ） ✅ 完了
4. **フェーズ4**: インタラクション実装 ✅ 完了
5. **フェーズ5**: 最適化・UI改善・バグ修正 ✅ 完了

### デバッグ

ブラウザのコンソールで以下にアクセス可能：
- `languageManager`: 言語管理
- `projectionManager`: 投影法管理
- `uiControls`: UI 制御
- `inputHandler`: 入力処理
- `webglRenderer`: WebGL レンダラー
- `mapProjectionApp`: メインアプリケーション

## ライセンス

MIT

## 参考資料

- [D3.js Geo Projections](https://d3js.org/d3-geo)
- [d3-geo-projection](https://github.com/d3/d3-geo-projection)
- [WebGL Specification](https://www.khronos.org/webgl/)
- [Map Projections - Wikipedia](https://en.wikipedia.org/wiki/Map_projection)

## 作者

n1n9

## 更新履歴

### v1.0.1 (2024-11-01)

**UI/UX 改善**
- ✨ 入力ソースの見出しを追加（「アップロード」「Webカメラ」「サンプル画像」）で入力方法を明確化
- 🐛 Webカメラプレビューの表示バグを修正（CSSのposition: absoluteオフスクリーン配置を削除）
- 📊 パフォーマンスセクション（FPS表示）の可読性を改善
- 📐 サイドバーにpadding-bottomを追加してスクロール時に最後のセクションが見えるよう修正
- 🎬 トランジションアニメーションのeaseInOutBackオーバーシュート量を増加（より誇張された動き）

### v1.0.0 (2024-11-01)

- 初回リリース
- 8種類の地図投影法をサポート
- WebGL 2.0 による高速レンダリング
- 日本語・英語対応
- Webカメラ、ファイルアップロード対応
