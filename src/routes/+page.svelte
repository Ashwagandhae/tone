<script lang="ts">
	import * as Tone from 'tone';
	import { BetterPolySynth } from '$lib/synth';
	import Editor from '$lib/components/Editor.svelte';

	let started = false;

	let synth: BetterPolySynth;

	async function start() {
		await Tone.start();
		synth = new BetterPolySynth();
		started = true;
	}
</script>

{#if started}
	<Editor {synth} />
{:else}
	<button on:click={start}>Start</button>
{/if}

<style>
	button {
		background: none;
		color: inherit;
		border: none;
		font-size: 2rem;
		width: 100%;
		height: 100%;
	}
</style>
