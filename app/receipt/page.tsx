"use client";

import { useState } from "react";

type ModelResult =
	| {
			total: string;
			timeTaken: number;
			cost: number;
			tokenInfo?: {
				inputTokens: number;
				outputTokens: number;
			};
	  }
	| {
			error: string;
	  };

type ModelResults = {
	[key: string]: ModelResult;
};

export default function ReceiptPage() {
	const [isDragging, setIsDragging] = useState(false);
	const [file, setFile] = useState<File | null>(null);
	const [results, setResults] = useState<ModelResults>({});
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);

		const files = e.dataTransfer.files;
		if (files.length > 0) {
			handleFile(files[0]);
		}
	};

	const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files && files.length > 0) {
			handleFile(files[0]);
		}
	};

	const handleFile = async (file: File) => {
		setError(null);
		setResults({});

		// Validate file size (20MB)
		if (file.size > 20 * 1024 * 1024) {
			setError("The selected file must be smaller than 20MB");
			return;
		}

		// Validate file type
		const validTypes = [
			"image/jpeg",
			"image/png",
			"image/webp",
			"image/heic",
			"image/heif",
		];
		if (!validTypes.includes(file.type)) {
			setError("The selected file must be a JPG, PNG, WEBP, HEIC or HEIF");
			return;
		}

		setFile(file);
		setIsLoading(true);

		const formData = new FormData();
		formData.append("receipt", file);

		try {
			const response = await fetch("/api/analyze-receipt", {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to analyze receipt");
			}

			// Handle streaming response
			const reader = response.body?.getReader();
			const decoder = new TextDecoder();

			if (!reader) {
				throw new Error("Failed to read response");
			}

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value);
				const lines = chunk.split("\n").filter(Boolean);

				for (const line of lines) {
					const { model, result } = JSON.parse(line);
					setResults((prev) => ({
						...prev,
						[model]: result,
					}));
				}
			}
		} catch (error) {
			console.error("Error analyzing receipt:", error);
			setError("The selected file could not be uploaded – try again");
		} finally {
			setIsLoading(false);
		}
	};

	const modelDisplayNames: { [key: string]: string } = {
		gemini: "Gemini 2.0 Flash (Google)",
		qwen72b: "Qwen2-VL 72B (Hyperbolic)",
		qwen7b: "Qwen2-VL 7B (Hyperbolic)",
		"claude-haiku": "Claude 3 Haiku (Anthropic)",
		gpt4: "GPT-4o-mini (OpenAI)",
	};

	const renderModelResult = (
		result: ModelResult | undefined,
		modelName: string,
	) => {
		if (!result) {
			return (
				<div className="govuk-panel govuk-panel--processing">
					<h2 className="govuk-panel__title">{modelName}</h2>
					<div className="govuk-panel__body">
						<progress className="govuk-progress">
							<span className="govuk-visually-hidden">Processing...</span>
						</progress>
						Analyzing...
					</div>
				</div>
			);
		}

		if ("error" in result) {
			return (
				<div className="govuk-error-summary" role="alert">
					<h2 className="govuk-error-summary__title">{modelName} Error</h2>
					<div className="govuk-error-summary__body">{result.error}</div>
				</div>
			);
		}

		return (
			<div className="govuk-panel govuk-panel--confirmation">
				<h2 className="govuk-panel__title">{modelName}</h2>
				<div className="govuk-panel__body">
					{result.total}
					<br />
					<div style={{ color: "white", fontSize: "16px", marginTop: "8px" }}>
						<div>Time: {result.timeTaken}ms</div>
						<div>
							Cost:{" "}
							{result.cost === -2
								? "Free (15 RPM)"
								: result.cost === -1
									? "Free"
									: `$${result.cost.toFixed(6)}`}
						</div>
						{result.tokenInfo && (
							<div>
								Tokens: {result.tokenInfo.inputTokens} in /{" "}
								{result.tokenInfo.outputTokens} out
							</div>
						)}
					</div>
				</div>
			</div>
		);
	};

	return (
		<div className="govuk-width-container">
			<main className="govuk-main-wrapper">
				<h1 className="govuk-heading-l">Upload Receipt</h1>

				<div
					className={`govuk-form-group${error ? " govuk-form-group--error" : ""}`}
				>
					<label className="govuk-label" htmlFor="receipt-upload">
						Upload a receipt image
					</label>
					<div className="govuk-hint">
						Files must be JPG, PNG, WEBP, HEIC or HEIF, and less than 20MB.
					</div>
					{error && (
						<p id="receipt-upload-error" className="govuk-error-message">
							<span className="govuk-visually-hidden">Error:</span> {error}
						</p>
					)}
					<div
						className="govuk-file-drop-zone"
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onDrop={handleDrop}
						style={{ textAlign: "center" }}
					>
						<input
							type="file"
							id="receipt-upload"
							name="receipt-upload"
							className={`govuk-file-upload${error ? " govuk-file-upload--error" : ""}`}
							accept="image/*"
							onChange={handleFileInput}
							aria-describedby={error ? "receipt-upload-error" : undefined}
						/>
					</div>
				</div>

				{isLoading && Object.keys(results).length === 0 && (
					<div className="govuk-body">
						<progress className="govuk-progress">
							<span className="govuk-visually-hidden">Loading...</span>
						</progress>
						Starting analysis with multiple models...
					</div>
				)}

				{(isLoading || Object.keys(results).length > 0) && (
					<div className="govuk-grid-row">
						<div className="govuk-grid-column-one-half">
							{renderModelResult(results.gemini, modelDisplayNames.gemini)}
							{renderModelResult(results.qwen72b, modelDisplayNames.qwen72b)}
							{renderModelResult(results.qwen7b, modelDisplayNames.qwen7b)}
						</div>
						<div className="govuk-grid-column-one-half">
							{renderModelResult(
								results["claude-haiku"],
								modelDisplayNames["claude-haiku"],
							)}
							{renderModelResult(results.gpt4, modelDisplayNames.gpt4)}
						</div>
					</div>
				)}
			</main>
		</div>
	);
}
