import { useEffect, useState } from 'react';

const defaultForm = {
	title: '',
	image: '',
	statement: '',
	difficulty: 'EASY',
	topic: '',
	constraints: '',
	timeLimit: '',
	memoryLimit: '',
	examples: [{ input: '', output: '', explanation: '' }],
};

export const QuestionForm = ({ initialValue = defaultForm, onSubmit, submitLabel }) => {
	const [form, setForm] = useState(initialValue);

	useEffect(() => {
		setForm(initialValue);
	}, [initialValue]);

	const handleChange = (event) => {
		const { name, value } = event.target;
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
			examples: [...(current.examples || []), { input: '', output: '', explanation: '' }],
		}));
	};

	const removeExample = (index) => {
		setForm((current) => ({
			...current,
			examples: current.examples.filter((_, exampleIndex) => exampleIndex !== index),
		}));
	};

	const handleSubmit = (event) => {
		event.preventDefault();
		onSubmit({
			...form,
			timeLimit: form.timeLimit ? Number(form.timeLimit) : undefined,
			memoryLimit: form.memoryLimit ? Number(form.memoryLimit) : undefined,
			examples: (form.examples || []).filter(
				(example) => example.input || example.output || example.explanation
			),
		});
	};

	return (
		<form className="question-form" onSubmit={handleSubmit}>
			<label>
				Title
				<input name="title" value={form.title} onChange={handleChange} required />
			</label>
			<label>
				Image URL
				<input name="image" value={form.image} onChange={handleChange} />
			</label>
			<label>
				Statement
				<textarea name="statement" value={form.statement} onChange={handleChange} required />
			</label>
			<label>
				Difficulty
				<select name="difficulty" value={form.difficulty} onChange={handleChange}>
					<option value="EASY">EASY</option>
					<option value="MEDIUM">MEDIUM</option>
					<option value="HARD">HARD</option>
				</select>
			</label>
			<label>
				Topic
				<input name="topic" value={form.topic} onChange={handleChange} />
			</label>
			<label>
				Constraints
				<textarea name="constraints" value={form.constraints} onChange={handleChange} />
			</label>
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
				{(form.examples || []).map((example, index) => (
					<article className="question-example-card" key={`example-${index}`}>
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
					</article>
				))}
			</section>
			<button type="submit">{submitLabel}</button>
		</form>
	);
};