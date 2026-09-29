import { performance } from "node:perf_hooks";
import { appConfig } from "../config/app.config.js";

export function createPerformanceTrace(startedAt = performance.now()) {
	return { startedAt, stages: {}, enabled: appConfig.perfLogging };
}

export async function measureStage(trace, name, operation) {
	const startedAt = performance.now();
	try {
		return await operation();
	} finally {
		if (trace?.enabled) trace.stages[name] = Math.round(performance.now() - startedAt);
	}
}

export function recordStage(trace, name, durationMs) {
	if (trace?.enabled && Number.isFinite(durationMs)) trace.stages[name] = Math.round(durationMs);
}

export function logPerformanceTrace(trace, extra = {}, responsePathTotalMs) {
	if (!trace?.enabled) return;
	const totalMs = Math.round(responsePathTotalMs ?? performance.now() - trace.startedAt);
	console.info("[CHAT PERF]", JSON.stringify({ ...trace.stages, ...extra, total: totalMs }));
}

export function runNonBlockingTask(name, task) {
	Promise.resolve().then(task).catch((error) => {
		console.error("Background task failed:", { task: name, name: error?.name, code: error?.code });
	});
}