<!DOCTYPE html>
<html lang="ja">

<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>About - 雑談</title>
	@vite(['resources/css/app.css', 'resources/js/app.jsx'])
</head>

<body class="page">
	<div class="min-h-screen flex flex-col">
		<!-- Header -->
		<header>
			<div class="container headerRow">
				<h1 class="brandTitle">雑談について</h1>
				<a href="/" class="btn btnGhost btnSm">ホームに戻る</a>
			</div>
		</header>

		<!-- Main Content -->
		<main class="flex-grow">
			<div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
				<div class="px-4 py-6 sm:px-0">
					<div class="bg-white overflow-hidden shadow-sm sm:rounded-lg">
						<div class="p-6 bg-white border-b border-gray-200">
							<div class="prose max-w-none">
								<h2 class="text-2xl font-semibold text-gray-900 mb-4">雑談とは</h2>
								<p class="text-gray-700 mb-4">
									雑談は、みんなでその日のテーマについて気軽にコメントできる場所です。<br>
									リモートワークの合間に、通勤の途中に、掃除中のちょっとした時間に。<br>
									日常の出来事から趣味、興味のあることまで、様々なテーマでコミュニケーションを楽しみましょう。
								</p>

								<h2 class="text-2xl font-semibold text-gray-900 mb-4 mt-8">使い方</h2>
								<ul class="list-disc list-inside text-gray-700 space-y-2 mb-4">
									<li>その日のテーマに対して、コメントを投稿しましょう</li>
									<li>1日に一回までコメントできます</li>
									<li>過去1ヶ月まで日付を遡れます</li>
								</ul>

								<h2 class="text-2xl font-semibold text-gray-900 mb-4 mt-8">ルール</h2>
								<ul class="list-disc list-inside text-gray-700 space-y-2 mb-4">
									<li>不適切な内容や誹謗中傷は禁止です</li>
									<li>スパムや宣伝目的の投稿は控えましょう</li>
									<li>個人情報の公開は避けましょう</li>
								</ul>

								<h2 class="text-2xl font-semibold text-gray-900 mb-4 mt-8">ログインすると</h2>
								<ul class="list-disc list-inside text-gray-700 space-y-2 mb-4">
									<li>他の人のコメントをお気に入りして、後から見ることができますよ</li>
									<li>自分の顔を登録することができますよ</li>
									<li>個人情報の公開は避けましょう</li>
								</ul>

								<h2 class="text-2xl font-semibold text-gray-900 mb-4 mt-8">お問い合わせ</h2>
								<p class="text-gray-700 mb-4">
									ご質問やご意見がございましたら、お気軽にお問い合わせください。
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</main>

		<!-- Footer -->
		<footer class="container" style="margin-top: 24px; opacity: 0.6;">
			<p style="text-align:center; font-size:12px;">
				© 2026 雑談
			</p>
		</footer>
	</div>
</body>

</html>