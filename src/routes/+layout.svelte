<script lang="ts">
	import '../global.css';
</script>

<div>
	<div class="header">
		<h1>Microtonal Music Editor</h1>
		<p>Make your own microtonal music</p>
	</div>
	<div class="contents">
		<slot />
	</div>
</div>

<style>
	div {
		display: flex;
		flex-direction: column;
		height: 100vh;
		width: 100vw;
	}
	.contents {
		flex: 1;
	}

	.header {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		box-sizing: border-box;
		height: 4rem;
	}
	.header > h1,
	.header > p {
		margin: 0;
	}
</style>
