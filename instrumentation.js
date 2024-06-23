import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

const sdk = new NodeSDK({
	traceExporter: new OTLPTraceExporter(),
	metricReader: new PeriodicExportingMetricReader({
		exporter: new OTLPMetricExporter()
	}),
	instrumentations: [getNodeAutoInstrumentations()]
});

sdk.start();
