import { useEffect, useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import Editor from '@monaco-editor/react';
import { questionApi } from '../services/questionService.js';

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// Full toolbar for rich fields (statement, constraints)
const FULL_TOOLBAR = [
	[{ header: [1, 2, 3, false] }],
	['bold', 'italic', 'underline', 'strike'],
	[{ list: 'ordered' }, { list: 'bullet' }],
	['blockquote', 'code-block'],
	['link'],
	['clean'],
];

// Light toolbar for shorter fields (title, topic)
const LIGHT_TOOLBAR = [['bold', 'italic', 'underline', 'strike'], [{ list: 'ordered' }, { list: 'bullet' }], ['clean']];

const DEFAULT_EXAMPLE = {
	input: '',
	output: '',
	explanation: '',
	image: '',
};

const DEFAULT_FORM = {
	title: '',
	image: '',
	statement: '',
	difficulty: 'EASY',
	topic: '',
	constraints: '',
	languages: [{ lang: 'cpp', codeSnippet: '', classSnippet: '' }],
	officialSolution: '',
	validatorCode: '',
	generatorCode: '',
	comparatorType: 'EXACT_MATCH',
	timeLimit: '',
	memoryLimit: '',
	examples: [DEFAULT_EXAMPLE],
	testcases: [],
};

const normalizeExample = (example = {}) => ({
	...DEFAULT_EXAMPLE,
	...example,
});

const normalizeForm = (value = DEFAULT_FORM) => {
	const langs = value?.languages?.length ? value.languages : DEFAULT_FORM.languages;

	return {
		...DEFAULT_FORM,
		...value,
		timeLimit: value?.timeLimit ?? '',
		memoryLimit: value?.memoryLimit ?? '',
		image: value?.image ?? '',
		officialSolution: value?.officialSolution ?? '',
		validatorCode: value?.validatorCode ?? '',
		generatorCode: value?.generatorCode ?? '',
		comparatorType: value?.comparatorType ?? 'EXACT_MATCH',
		languages: langs.map((l) => ({
			lang: l.lang,
			codeSnippet: l.codeSnippet || '',
			classSnippet: l.classSnippet || '',
		})),
		examples: (value?.examples?.length ? value.examples : DEFAULT_FORM.examples).map(
			normalizeExample
		),
		testcases: (value?.testcases || []).map((tc) => ({
			input: tc.input || '',
		})),
	};
};

const uploadToCloudinary = async (file) => {
	if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
		throw new Error(
			'Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to enable image uploads.'
		);
	}

	const formData = new FormData();
	formData.append('file', file);
	formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

	const response = await fetch(
		`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
		{
			method: 'POST',
			body: formData,
		}
	);

	const payload = await response.json();

	if (!response.ok) {
		throw new Error(payload?.error?.message || 'Cloudinary upload failed.');
	}

	return payload.secure_url || payload.url;
};

// ── AutoTestcaseSection ───────────────────────────────────────────────────────
// Handles AI-assisted testcase generation entirely within the form.
// Props:
//   form          — current form state (read)
//   setForm       — update form state
function AutoTestcaseSection({ form, setForm }) {
	const [genStatus, setGenStatus]         = useState('idle'); // idle | loading | done | error
	const [genError, setGenError]           = useState('');
	const [families, setFamilies]           = useState([]);     // [{ name, description, count }]
	const [familyStatus, setFamilyStatus]   = useState('idle');
	const [tcStatus, setTcStatus]           = useState('idle');
	const [tcError, setTcError]             = useState('');

	// Strip HTML tags to get plain text for the AI prompt
	const stripHtml = (html = '') => {
		const d = document.createElement('div');
		d.innerHTML = html;
		return (d.textContent || d.innerText || '').trim();
	};

	const plainStatement   = stripHtml(form.statement);
	const plainConstraints = stripHtml(form.constraints);
	const plainTopic       = stripHtml(form.topic);

	const preconditionsMet = plainStatement && plainConstraints && plainTopic;

	const handleGenerateGenerator = async () => {
		setGenStatus('loading');
		setGenError('');
		setFamilies([]);
		try {
			const res = await questionApi.aiGenerateGenerator({
				statement:       plainStatement,
				constraints:     plainConstraints,
				topic:           plainTopic,
				officialSolution: form.officialSolution || '',
			});
			setForm((f) => ({ ...f, generatorCode: res.generatorCode }));
			setGenStatus('done');
		} catch (err) {
			setGenError(err.message || 'Generation failed.');
			setGenStatus('error');
		}
	};

	const handleDiscoverFamilies = async () => {
		setFamilyStatus('loading');
		try {
			const res = await questionApi.generatorListFamilies(form.generatorCode);
			setFamilies(res.families.map((f) => ({ ...f, count: 5 })));
			setFamilyStatus('done');
		} catch (err) {
			setFamilyStatus('error');
		}
	};

	const handleGenerateTestcases = async () => {
		setTcStatus('loading');
		setTcError('');
		try {
			const res = await questionApi.generatorRun(
				form.generatorCode,
				families.filter((f) => f.count > 0).map(({ name, count }) => ({ name, count }))
			);
			const newTcs = res.inputs.map((input) => ({ input }));
			setForm((f) => ({ ...f, testcases: [...newTcs, ...f.testcases] }));
			setTcStatus('done');
		} catch (err) {
			setTcError(err.message || 'Testcase generation failed.');
			setTcStatus('error');
		}
	};

	return (
		<section className="ai-tc-section">
			<div className="section-heading" style={{ margin: '8px 0 14px' }}>
				<h3>Automated Testcase Generation</h3>
				<span className="status-chip status-chip--admin" style={{ fontSize: '0.72rem' }}>AI</span>
			</div>

			{!preconditionsMet && (
				<p className="ai-tc-precondition-warning">
					Please complete Statement, Constraints, and Topic before generating testcases.
				</p>
			)}

			{/* Step 1: generate the generator */}
			<div className="ai-tc-step">
				<div className="ai-tc-step__header">
					<span className="ai-tc-step__num">1</span>
					<span>Generate testcase generator code</span>
					<button
						type="button"
						className="ai-tc-btn"
						disabled={!preconditionsMet || genStatus === 'loading'}
						onClick={handleGenerateGenerator}
					>
						{genStatus === 'loading' ? 'Generating…' : 'Generate Testcase Generator'}
					</button>
				</div>
				{genError && <p className="ai-tc-error">{genError}</p>}
			</div>

			{/* Generator code editor */}
			<div style={{ marginBottom: '16px' }}>
				<label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
					Generator Code (C++)
				</label>
				<Editor
					height="240px"
					language="cpp"
					theme="vs-dark"
					value={form.generatorCode}
					onChange={(v) => setForm((f) => ({ ...f, generatorCode: v ?? '' }))}
					options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, wordWrap: 'on' }}
				/>
			</div>

			{/* Step 2: discover families */}
			<div className="ai-tc-step">
				<div className="ai-tc-step__header">
					<span className="ai-tc-step__num">2</span>
					<span>Discover families (compiles generator in Docker)</span>
					<button
						type="button"
						className="ai-tc-btn"
						disabled={!form.generatorCode.trim() || familyStatus === 'loading'}
						onClick={handleDiscoverFamilies}
					>
						{familyStatus === 'loading' ? 'Compiling…' : 'Load Families'}
					</button>
				</div>
				{familyStatus === 'error' && (
					<p className="ai-tc-error">Failed to compile or run generator. Check the code above.</p>
				)}
			</div>

			{/* Family count inputs */}
			{families.length > 0 && (
				<div className="ai-tc-families">
					{families.map((fam, i) => (
						<div key={i} className="ai-tc-family-row">
							<div className="ai-tc-family-info">
								<span className="ai-tc-family-name">{fam.name}</span>
								<span className="ai-tc-family-desc">{fam.description}</span>
							</div>
							<input
								type="number"
								min="0"
								max="100"
								value={fam.count}
								className="ai-tc-family-count"
								onChange={(e) => {
									const updated = [...families];
									updated[i] = { ...updated[i], count: Number(e.target.value) };
									setFamilies(updated);
								}}
							/>
						</div>
					))}
				</div>
			)}

			{/* Step 3: generate testcases */}
			{families.length > 0 && (
				<div className="ai-tc-step">
					<div className="ai-tc-step__header">
						<span className="ai-tc-step__num">3</span>
						<span>Generate testcases</span>
						<button
							type="button"
							className="ai-tc-btn ai-tc-btn--primary"
							disabled={tcStatus === 'loading'}
							onClick={handleGenerateTestcases}
						>
							{tcStatus === 'loading' ? 'Generating…' : 'Generate Testcases'}
						</button>
					</div>
					{tcStatus === 'done' && (
						<p className="ai-tc-success">Testcases added to the list below. Review and save.</p>
					)}
					{tcError && <p className="ai-tc-error">{tcError}</p>}
				</div>
			)}
		</section>
	);
}

// Reusable Quill field wrapper with label
function RichField({ label, value, onChange, toolbar = FULL_TOOLBAR, required }) {
	return (
		<div className="rich-field">
			<span className="rich-field__label">
				{label}
				{required && <span className="rich-field__required"> *</span>}
			</span>
			<div className="rich-field__editor">
				<ReactQuill
					theme="snow"
					value={value}
					onChange={onChange}
					modules={{ toolbar }}
				/>
			</div>
		</div>
	);
}

export const QuestionForm = ({ initialValue = DEFAULT_FORM, onSubmit, submitLabel }) => {
	const [form, setForm] = useState(() => normalizeForm(initialValue));
	const [uploadStatus, setUploadStatus] = useState({});
	const [globalUploadError, setGlobalUploadError] = useState('');
	const [tcModal, setTcModal] = useState({ open: false, input: '', editIndex: null });

	useEffect(() => {
		document.body.style.overflow = tcModal.open ? 'hidden' : '';
		return () => { document.body.style.overflow = ''; };
	}, [tcModal.open]);

	useEffect(() => {
		setForm(normalizeForm(initialValue));
	}, [initialValue]);

	const handleChange = (event) => {
		const { name, value } = event.target;
		setForm((current) => ({ ...current, [name]: value }));
	};

	const setRichField = (name) => (value) => {
		setForm((current) => ({ ...current, [name]: value }));
	};

	const updateExample = (index, field, value) => {
		setForm((current) => {
			const examples = [...(current.examples || [])];
			examples[index] = { ...examples[index], [field]: value };
			return { ...current, examples };
		});
	};

	const addExample = () => {
		setForm((current) => ({
			...current,
			examples: [...(current.examples || []), normalizeExample()],
		}));
	};

	const removeExample = (index) => {
		setForm((current) => ({
			...current,
			examples: current.examples.filter((_, exampleIndex) => exampleIndex !== index),
		}));
	};

	const openTcModal = (editIndex = null) => {
		if (editIndex !== null) {
			const tc = form.testcases[editIndex];
			setTcModal({ open: true, input: tc.input, editIndex });
		} else {
			setTcModal({ open: true, input: '', editIndex: null });
		}
	};

	const closeTcModal = () => setTcModal({ open: false, input: '', editIndex: null });

	const saveTcModal = () => {
		const { input, editIndex } = tcModal;
		setForm((current) => {
			const testcases = [...current.testcases];
			if (editIndex !== null) {
				testcases[editIndex] = { input };
			} else {
				testcases.push({ input });
			}
			return { ...current, testcases };
		});
		closeTcModal();
	};

	const removeTestcase = (index) => {
		setForm((current) => ({
			...current,
			testcases: current.testcases.filter((_, i) => i !== index),
		}));
	};

	const setTargetStatus = (target, nextStatus) => {
		setUploadStatus((current) => ({
			...current,
			[target]: nextStatus,
		}));
	};

	const handleImageUpload = async ({ file, target, onSuccess }) => {
		if (!file) {
			return;
		}

		setGlobalUploadError('');
		setTargetStatus(target, { isUploading: true, error: '' });

		try {
			const uploadedUrl = await uploadToCloudinary(file);
			onSuccess(uploadedUrl);
			setTargetStatus(target, { isUploading: false, error: '' });
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Image upload failed.';
			setTargetStatus(target, { isUploading: false, error: message });
			setGlobalUploadError(message);
		}
	};

	const handleSubmit = (event) => {
		event.preventDefault();
		onSubmit({
			...form,
			timeLimit: form.timeLimit ? Number(form.timeLimit) : undefined,
			memoryLimit: form.memoryLimit ? Number(form.memoryLimit) : undefined,
			examples: (form.examples || []).filter(
				(example) => example.input || example.output || example.explanation || example.image
			),
		});
	};

	return (
		<form className="question-form" onSubmit={handleSubmit}>
			{/* Title — light toolbar */}
			<RichField
				label="Title"
				value={form.title}
				onChange={setRichField('title')}
				toolbar={LIGHT_TOOLBAR}
				required
			/>

			{/* Statement — full toolbar, spans full width */}
			<RichField
				label="Statement"
				value={form.statement}
				onChange={setRichField('statement')}
				toolbar={FULL_TOOLBAR}
				required
			/>

			{/* Difficulty — plain select, no rich text needed */}
			<label>
				Difficulty
				<select name="difficulty" value={form.difficulty} onChange={handleChange}>
					<option value="EASY">EASY</option>
					<option value="MEDIUM">MEDIUM</option>
					<option value="HARD">HARD</option>
				</select>
			</label>

			{/* Comparator type */}
			<label>
				Comparator type
				<select name="comparatorType" value={form.comparatorType} onChange={handleChange}>
					<option value="EXACT_MATCH">Exact match</option>
					<option value="FLOAT_EPSILON">Float epsilon (1e-6)</option>
					<option value="UNORDERED_VECTOR">Unordered vector</option>
					<option value="CUSTOM">Custom</option>
				</select>
			</label>

			{/* Topic — light toolbar */}
			<RichField
				label="Topic"
				value={form.topic}
				onChange={setRichField('topic')}
				toolbar={LIGHT_TOOLBAR}
			/>

			{/* Constraints — full toolbar */}
			<RichField
				label="Constraints"
				value={form.constraints}
				onChange={setRichField('constraints')}
				toolbar={FULL_TOOLBAR}
			/>

			{/* Question image */}
			<div className="question-media-field question-media-field--question">
				<label>
					Question image URL
					<input
						name="image"
						value={form.image}
						onChange={handleChange}
						placeholder="Paste a Cloudinary URL"
					/>
				</label>
				<label>
					Upload question image
					<input
						type="file"
						accept="image/*"
						onChange={async (event) => {
							await handleImageUpload({
								file: event.target.files?.[0],
								target: 'question',
								onSuccess: (url) => setForm((current) => ({ ...current, image: url })),
							});
							event.target.value = '';
						}}
					/>
				</label>
				{uploadStatus.question?.isUploading ? (
					<p className="question-upload-status">Uploading question image...</p>
				) : null}
				{uploadStatus.question?.error ? (
					<p className="question-upload-status question-upload-status--error">
						{uploadStatus.question.error}
					</p>
				) : null}
				{form.image ? (
					<div className="question-media-preview">
						<img src={form.image} alt="Question preview" />
					</div>
				) : null}
			</div>

			{/* Language snippets */}
			<section className="question-language-snippets">
				<div className="section-heading" style={{ margin: '20px 0 10px' }}>
					<h3>C++ Code &amp; Class Snippets</h3>
				</div>
				{form.languages.map((langData, index) => (
				<div key={langData.lang} className="lang-snippet-container" style={{ display: 'grid', gap: '14px' }}>
						<div>
							<label style={{ display: 'block', marginBottom: '6px' }}>
								C++ Code Snippet (Runner Wrapper)
							</label>
							<Editor
								height="220px"
								language="cpp"
								theme="vs-dark"
								value={langData.codeSnippet}
								onChange={(value) => {
									const updated = [...form.languages];
									updated[index] = { ...updated[index], codeSnippet: value ?? '' };
									setForm((curr) => ({ ...curr, languages: updated }));
								}}
								options={{
									minimap: { enabled: false },
									fontSize: 13,
									scrollBeyondLastLine: false,
									wordWrap: 'on',
								}}
							/>
						</div>
						<div>
							<label style={{ display: 'block', marginBottom: '6px' }}>
								C++ Class Snippet (User Starter Code)
							</label>
							<Editor
								height="220px"
								language="cpp"
								theme="vs-dark"
								value={langData.classSnippet}
								onChange={(value) => {
									const updated = [...form.languages];
									updated[index] = { ...updated[index], classSnippet: value ?? '' };
									setForm((curr) => ({ ...curr, languages: updated }));
								}}
								options={{
									minimap: { enabled: false },
									fontSize: 13,
									scrollBeyondLastLine: false,
									wordWrap: 'on',
								}}
							/>
						</div>
					</div>
				))}
			</section>

			{/* Official Solution — admin only, not exposed to users */}
			<section className="question-language-snippets">
				<div className="section-heading" style={{ margin: '20px 0 10px' }}>
					<h3>Official Solution</h3>
				</div>
				<Editor
					height="260px"
					language="cpp"
					theme="vs-dark"
					value={form.officialSolution}
					onChange={(value) => setForm((curr) => ({ ...curr, officialSolution: value ?? '' }))}
					options={{
						minimap: { enabled: false },
						fontSize: 13,
						scrollBeyondLastLine: false,
						wordWrap: 'on',
					}}
				/>
			</section>

			{/* Validator Code — only relevant when comparatorType === CUSTOM */}
			{form.comparatorType === 'CUSTOM' && (
				<section className="question-language-snippets">
					<div className="section-heading" style={{ margin: '20px 0 10px' }}>
						<h3>Validator Code (C++) — for CUSTOM comparator</h3>
					</div>
					<Editor
						height="220px"
						language="cpp"
						theme="vs-dark"
						value={form.validatorCode}
						onChange={(value) => setForm((curr) => ({ ...curr, validatorCode: value ?? '' }))}
						options={{
							minimap: { enabled: false },
							fontSize: 13,
							scrollBeyondLastLine: false,
							wordWrap: 'on',
						}}
					/>
				</section>
			)}

			{/* AI-assisted testcase generation */}
			<section className="question-language-snippets">
				<AutoTestcaseSection form={form} setForm={setForm} />
			</section>

			{/* Testcases */}
			<section className="question-testcases">
				<div className="question-examples-header">
					<h2>Testcases</h2>
					<button type="button" onClick={() => openTcModal()}>
						Add testcase
					</button>
				</div>
				{form.testcases.length === 0 ? (
					<p className="empty-state">No testcases added yet.</p>
				) : (
					<table className="testcases-table">
						<thead>
							<tr>
								<th>#</th>
								<th>Input</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{form.testcases.map((tc, index) => (
								<tr key={index}>
									<td>{index + 1}</td>
									<td><pre>{tc.input}</pre></td>
									<td>
										<button type="button" onClick={() => openTcModal(index)}>Edit</button>
										{' '}
										<button type="button" onClick={() => removeTestcase(index)}>Remove</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</section>

			<label>
				Time limit (ms)
				<input type="number" name="timeLimit" value={form.timeLimit} onChange={handleChange} />
			</label>
			<label>
				Memory limit (MB)
				<input type="number" name="memoryLimit" value={form.memoryLimit} onChange={handleChange} />
			</label>

			<section className="question-examples">
				<div className="question-examples-header">
					<h2>Examples</h2>
					<button type="button" onClick={addExample}>
						Add example
					</button>
				</div>

				{(form.examples || []).map((example, index) => {
					const key = `example-${index}`;

					return (
						<article className="question-example-card" key={key}>
							<div className="question-example-card__header">
								<strong>Example {index + 1}</strong>
								<button type="button" onClick={() => removeExample(index)}>
									Remove
								</button>
							</div>

							<label>
								Input
								<textarea
									value={example.input}
									onChange={(event) => updateExample(index, 'input', event.target.value)}
								/>
							</label>

							<label>
								Output
								<textarea
									value={example.output}
									onChange={(event) => updateExample(index, 'output', event.target.value)}
								/>
							</label>

							<label>
								Explanation
								<textarea
									value={example.explanation}
									onChange={(event) => updateExample(index, 'explanation', event.target.value)}
								/>
							</label>

							<div className="question-media-field question-media-field--compact">
								<label>
									Example image URL
									<input
										value={example.image || ''}
										onChange={(event) => updateExample(index, 'image', event.target.value)}
										placeholder="Paste a Cloudinary URL"
									/>
								</label>
								<label>
									Upload example image
									<input
										type="file"
										accept="image/*"
										onChange={async (event) => {
											await handleImageUpload({
												file: event.target.files?.[0],
												target: key,
												onSuccess: (url) => updateExample(index, 'image', url),
											});
											event.target.value = '';
										}}
									/>
								</label>
								{uploadStatus[key]?.isUploading ? (
									<p className="question-upload-status">Uploading example image...</p>
								) : null}
								{uploadStatus[key]?.error ? (
									<p className="question-upload-status question-upload-status--error">
										{uploadStatus[key].error}
									</p>
								) : null}
								{example.image ? (
									<div className="question-media-preview question-media-preview--small">
										<img src={example.image} alt={`Example ${index + 1} preview`} />
									</div>
								) : null}
							</div>
						</article>
					);
				})}
			</section>

			{globalUploadError ? (
				<p className="question-upload-status question-upload-status--error">{globalUploadError}</p>
			) : null}

			<button type="submit">{submitLabel}</button>

			{/* Testcase modal */}
			{tcModal.open ? (
				<div className="tc-modal-overlay" onClick={closeTcModal}>
					<div className="tc-modal" onClick={(e) => e.stopPropagation()}>
						<div className="tc-modal__header">
							<span className="tc-modal__eyebrow">Testcase</span>
							<h2 className="tc-modal__title">
								{tcModal.editIndex !== null ? `Edit testcase #${tcModal.editIndex + 1}` : 'Add testcase'}
							</h2>
							<button className="tc-modal__close" type="button" onClick={closeTcModal} aria-label="Close">✕</button>
						</div>

						<div className="tc-modal__question-ref">
							<p className="tc-modal__question-label">Question statement</p>
							<div
								className="rich-content tc-modal__question-body"
								dangerouslySetInnerHTML={{ __html: form.statement }}
							/>
						</div>

						<div className="tc-modal__fields">
							<label className="tc-modal__field-label">
								Input
								<textarea
									className="tc-modal__textarea"
									value={tcModal.input}
									onChange={(e) => setTcModal((m) => ({ ...m, input: e.target.value }))}
									placeholder="Enter testcase input"
									rows={8}
									autoFocus
								/>
							</label>
						</div>

						<div className="tc-modal__actions">
							<button className="tc-modal__btn tc-modal__btn--cancel" type="button" onClick={closeTcModal}>
								Cancel
							</button>
							<button
								className="tc-modal__btn tc-modal__btn--save"
								type="button"
								onClick={saveTcModal}
								disabled={!tcModal.input.trim()}
							>
								{tcModal.editIndex !== null ? 'Update' : 'Add'} testcase
							</button>
						</div>
					</div>
				</div>
			) : null}
		</form>
	);
};