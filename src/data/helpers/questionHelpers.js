import * as yup from 'yup';
import { omit } from 'lodash';
import { getFormatter } from '../../components/ui/Table/ColumnFormatters';
import { getDateTime } from '../utils';
import uploadFilesToS3 from '../utils/uploadFilesToS3';
import { getRelativePath } from './commonHelpers';
import { advancedSettingsValidationSchemaQuestions } from './advancedSettingsHelpers';
import { CalendarYellowIcon } from '../../assets/svg-icons';
import dayjs from 'dayjs';

const { REACT_APP_MEDIA_ENDPOINT } = process.env;
const defaultSummaryImage = `${REACT_APP_MEDIA_ENDPOINT}/media/photos/3a4ffcab-42a6-4926-9e12-10542a5c8f09.jpeg`;
const defaultSummaryImageName = 'Background Default';

export const questionTableColumns = [
	{
		dataField: 'question',
		text: 'QUESTION',
		sort: true,
		formatter: (content, row) =>
			getFormatter('textWithIcon', {
				content,
				showIcon: row.total_questions > 1
			})
	},
	{
		dataField: 'question_type',
		text: 'QUESTION TYPE',
		sort: true,
		formatter: (content) =>
			getFormatter('markup', { content: content?.toUpperCase() })
	},
	{
		dataField: 'post_date',
		text: 'POST, SCHEDULE DATE | TIME',
		sort: true,
		formatter: (content, row) =>
			getFormatter('textAndIcon', {
				content: dayjs(content).format('DD-MM-YYYY | HH:mm'),
				Icon: row.is_scheduled ? CalendarYellowIcon : null
			})
	},
	{
		dataField: 'end_date',
		text: 'CLOSED DATE | TIME',
		sort: true,
		formatter: (content) =>
			getFormatter('markup', {
				content:
					content === '-' ? '-' : dayjs(content).format('DD-MM-YYYY | HH:mm')
			})
	},
	{
		dataField: 'labels',
		text: 'LABELS',
		sort: true,
		formatter: (content) =>
			getFormatter('markup', {
				content: `${content[0]}${content[1] ? `, ${content[1]}` : ''}`
			})
	},
	{
		dataField: 'status',
		sort: true,
		text: 'STATUS',
		formatter: (content) => getFormatter('status', { status: content })
	},

	{
		dataField: 'participants',
		sort: true,
		text: 'PARTICIPANTS',
		formatter: (content) => getFormatter('markup', { content: `${content}` })
	},
	{
		dataField: 'user',
		sort: true,
		text: 'USER',
		formatter: (content) => getFormatter('markup', { content: `${content}` })
	},
	{
		dataField: 'location',
		text: 'LOCATION',
		sort: true,
		formatter: (content) => getFormatter('wrapper', { content })
	},
	{
		dataField: 'options',
		text: 'OPTIONS',
		formatter: (_, row) =>
			getFormatter('options', {
				title: 'QUIZ DETAIL',
				notificationTitle: 'NOTIFICATION',
				contentType: 'trivia',
				contentId: row.id,
				notificationId: row.notification_id,
				notificationStatus: row.notification_status
			})
	}
];

export const questionParticipantsTableColumns = [
	{
		dataField: 'username',
		text: 'USERNAME',
		sort: true,
		formatter: (content) => getFormatter('markup', { content: `${content}` })
	},
	{
		dataField: 'answer',
		text: 'ANSWER',
		sort: true,
		formatter: (content) => getFormatter('markup', { content: `${content}` })
	},
	{
		dataField: 'date_and_time',
		text: 'DATE AND TIME',
		sort: true,
		formatter: (content) =>
			getFormatter('markup', { content: getDateTime(content) })
	}
];

export const questionSlideInitialValues = {
	question: '',
	uploadedFiles: [],
	labels: [],
	dropbox_url: '',
	answers: [
		{
			answer: ''
		},
		{
			answer: ''
		}
	]
};

export const questionsFormInitialValues = (
	allRules,
	isQuizGenerator = false
) => {
	const rules = {};

	allRules.forEach((rule) => {
		rules[rule._id] = false;
	});
	return {
		resultsUploadedFiles: [
			{ media_url: defaultSummaryImage, file_name: defaultSummaryImageName }
		],
		positiveResultsUploadedFiles: [
			{ media_url: defaultSummaryImage, file_name: defaultSummaryImageName }
		],
		negativeResultsUploadedFiles: [
			{ media_url: defaultSummaryImage, file_name: defaultSummaryImageName }
		],
		coverImageUploadedFiles: [],
		general_info: {
			save_draft: true,
			question_type: isQuizGenerator ? 'quiz' : 'poll',
			results: 'THANKS, SEE YOU NEXT TIME!',
			results_image: '',
			results_filename: '',
			results_dropbox_url: '',
			positive_results: 'GREAT JOB!',
			positive_results_image: '',
			positive_results_filename: '',
			positive_results_dropbox_url: '',
			negative_results: 'BETTER LUCK NEXT TIME!',
			negative_results_image: '',
			negative_results_filename: '',
			negative_results_dropbox_url: '',
			question_title: '',
			cover_image: '',
			cover_image_file_name: '',
			cover_image_width: '',
			cover_image_height: '',
			cover_image_dropbox_url: ''
		},
		questions: [],
		active_question_id: null,
		active_question_end_date: null,
		transition_to: null,
		rules
	};
};

export const questionDataFormatterForService = async (
	values,
	// isDraft,
	status = 'draft',
	allRules = [],
	isQuestionGenerator = false
) => {
	const filteredRules = allRules.filter((rule) => values.rules[rule._id]);
	const pollFilesToUpload = [
		values.coverImageUploadedFiles[0] || null,
		values.resultsUploadedFiles[0] || null
	];

	const quizFilesToUpload = [
		values.coverImageUploadedFiles[0] || null,
		values.positiveResultsUploadedFiles[0] || null,
		values.negativeResultsUploadedFiles[0] || null
	];

	!isQuestionGenerator &&
		values.questions.forEach((item) => {
			if (values.general_info.question_type === 'poll') {
				pollFilesToUpload.push(item.uploadedFiles[0] || null);
			} else {
				quizFilesToUpload.push(item.uploadedFiles[0] || null);
			}
		});

	let pollUploadedFiles = [null, null];
	let quizUploadedFiles = [null, null, null];

	if (values.general_info.question_type === 'poll') {
		pollUploadedFiles = await uploadFilesToS3(
			pollFilesToUpload,
			'questionLibrary'
		);
	} else {
		quizUploadedFiles = await uploadFilesToS3(
			quizFilesToUpload,
			'questionLibrary'
		);
	}

	const [pollCoverImageFile, resultsFile, ...pollSlideFiles] =
		pollUploadedFiles;
	const [
		quizCoverImageFile,
		positiveResultsFile,
		negativeResultFile,
		...quizSlideFiles
	] = quizUploadedFiles;

	const coverImageFile = pollCoverImageFile || quizCoverImageFile;

	const payload = {
		general_info: {
			...values.general_info,
			// save_draft: isDraft,
			results_image: getRelativePath(resultsFile?.media_url),
			results_filename: resultsFile?.file_name || '',
			positive_results_image: getRelativePath(positiveResultsFile?.media_url),
			positive_results_filename: positiveResultsFile?.file_name || '',
			negative_results_image: getRelativePath(negativeResultFile?.media_url),
			negative_results_filename: negativeResultFile?.file_name || '',
			cover_image: getRelativePath(coverImageFile?.media_url),
			cover_image_file_name: coverImageFile?.file_name || '',
			cover_image_width: coverImageFile?.width || 0,
			cover_image_height: coverImageFile?.height || 0,
			// Spreading the question schedule flag for edit state
			...(values?.general_info?.start_date
				? { schedule_flag_enabled: true }
				: {})
		},
		questions: values.questions.map((item, index) => ({
			...omit(item, ['uploadedFiles', 'answers']),
			...(values.general_info.question_type === 'poll'
				? {
						image: getRelativePath(pollSlideFiles[index]?.media_url),
						file_name: pollSlideFiles[index]?.file_name || '',
						height: pollSlideFiles[index]?.height || 0,
						width: pollSlideFiles[index]?.width || 0
				  }
				: {
						image: getRelativePath(quizSlideFiles[index]?.media_url),
						file_name: quizSlideFiles[index]?.file_name || '',
						height: quizSlideFiles[index]?.height || 0,
						width: quizSlideFiles[index]?.width || 0
				  }),
			answers: item.answers.map((answerItem, answerIndex) => ({
				...answerItem,
				position:
					status !== 'draft' ? answerItem.position ?? answerIndex : answerIndex,
				type:
					values.general_info.question_type === 'poll'
						? 'poll'
						: answerIndex === 0
						? 'right_answer'
						: `wrong_answer_${answerIndex}`
			})),
			position: index + 1
		})),
		...(values.question_id ? { question_id: values.question_id } : {}),
		rules: filteredRules,
		is_scheduled: values.is_scheduled
	};

	if (values.active_question_id) {
		payload.active_question_id = values.active_question_id;
		payload.transition_to = values.transition_to;

		if (values.transition_to === 'closed') {
			payload.active_question_end_date = values.active_question_end_date;
		}
	}

	return payload;
};

const updatingQuestionsSlides = (questionsSlides = []) => {
	return questionsSlides.map(({ labels, ...rest }) => {
		const labelsArray = labels.map((item) => ({ id: -1, name: item }));

		return {
			...rest,
			uploadedFiles: rest.image
				? [
						{
							file_name: rest.file_name,
							media_url: `${REACT_APP_MEDIA_ENDPOINT}/${rest.image}`,
							height: rest.height,
							width: rest.width
						}
				  ]
				: [],
			labels: labelsArray
		};
	});
};

export const questionDataFormatterForForm = (question, allRules) => {
	const {
		id,
		summary,
		questions,
		end_date,
		start_date,
		is_scheduled,
		...rest
	} = question;

	const rules = {};

	allRules.forEach((rule) => {
		rules[rule._id] = false;
	});
	//This loop should always run after the first one.
	question.rules.forEach((rule) => {
		rules[rule._id] = true;
	});

	const formattedQuestion = {
		is_scheduled,
		rules: rules,
		question_id: id,
		coverImageUploadedFiles: rest.cover_image
			? [
					{
						file_name: rest.cover_image_file_name,
						media_url: `${REACT_APP_MEDIA_ENDPOINT}/${rest.cover_image}`,
						height: rest.cover_image_height,
						width: rest.cover_image_width
					}
			  ]
			: [],
		...(question.question_type === 'poll'
			? {
					resultsUploadedFiles: summary.results_image
						? [
								{
									file_name: summary.results_filename,
									media_url: `${REACT_APP_MEDIA_ENDPOINT}/${summary.results_image}`
								}
						  ]
						: [],
					positiveResultsUploadedFiles: [],
					negativeResultsUploadedFiles: []
			  }
			: {
					resultsUploadedFiles: [],
					positiveResultsUploadedFiles: summary.positive_results_image
						? [
								{
									file_name: summary.positive_results_filename,
									media_url: `${REACT_APP_MEDIA_ENDPOINT}/${summary.positive_results_image}`
								}
						  ]
						: [],
					negativeResultsUploadedFiles: summary.negative_results_image
						? [
								{
									file_name: summary.negative_results_filename,
									media_url: `${REACT_APP_MEDIA_ENDPOINT}/${summary.negative_results_image}`
								}
						  ]
						: []
			  }),
		general_info: {
			save_draft: rest.is_draft,
			question_type: rest.question_type,
			question_title: rest.question_title,
			cover_image_dropbox_url: rest.cover_image_dropbox_url,
			...(is_scheduled && { end_date, start_date }),
			...(question.question_type === 'poll'
				? {
						results: summary.results,
						results_dropbox_url: summary.results_dropbox_url
				  }
				: {
						negative_results: summary.negative_results,
						negative_results_dropbox_url: summary.negative_results_dropbox_url,
						positive_results: summary.positive_results,
						positive_results_dropbox_url: summary.positive_results_dropbox_url
				  })
		},
		questions: updatingQuestionsSlides(questions),
		active_question_id: null,
		active_question_end_date: null,
		transition_to: null
	};
	formattedQuestion.rules = rules;
	return formattedQuestion;
};

export const quizGeneratorFormatter = (data) => {
	return data.map((item) => ({
		question: item.question.slice(0, 55),
		answers: [
			{
				answer: item.correct_answer.slice(0, 29)
			},
			{
				answer: item.wrong_answer_1.slice(0, 29)
			},
			{
				answer: item.wrong_answer_2.slice(0, 29)
			},
			{
				answer: item.wrong_answer_3.slice(0, 29)
			}
		],
		dropbox_url: '',
		labels: []
	}));
};
const questionQuizGeneratorSchema = yup
	.array()
	.of(
		yup.object({
			question: yup.string().trim().required('You need to enter a question'),
			isLocked: yup.boolean(),
			answers: yup.array().of(
				yup.object().shape({
					answer: yup.string().trim()
				})
			)
		})
	)
	.min(10, 'Atleast 10 questions are required');

const questionsSlideSchema = yup
	.array()
	.of(
		yup.object({
			question: yup.string().trim().required('You need to enter a question'),
			uploadedFiles: yup
				.array()
				.min(1, 'You need to upload an image in order to post'),
			dropbox_url: yup.string(),
			labels: yup
				.array()
				.min(1, 'You need to add 1 more label in order to post question'),
			answers: yup
				.array()
				.of(
					yup.object().shape({
						answer: yup.string().trim().required('You need to enter an answer')
					})
				)
				.min(2, 'Atleast 2 answers are required')
		})
	)
	.min(1, 'Atleast 1 question is required');

export const questionQuizGeneratorFormValidationSchema = yup.object().shape({
	questions: questionQuizGeneratorSchema
});

// V1 is with summary component and no trivia component
export const questionsFormValidationSchemaV1 =
	advancedSettingsValidationSchemaQuestions.shape({
		resultsUploadedFiles: yup.array().when('general_info.question_type', {
			is: (val) => val === 'poll',
			then: (schema) =>
				schema.min(1, 'You need to upload an image in order to post'),
			otherwise: (schema) => schema.min(0)
		}),
		positiveResultsUploadedFiles: yup
			.array()
			.when('general_info.question_type', {
				is: (val) => val === 'quiz',
				then: (schema) =>
					schema.min(1, 'You need to upload an image in order to post'),
				otherwise: (schema) => schema.min(0)
			}),
		negativeResultsUploadedFiles: yup
			.array()
			.when('general_info.question_type', {
				is: (val) => val === 'quiz',
				then: (schema) =>
					schema.min(1, 'You need to upload an image in order to post'),
				otherwise: (schema) => schema.min(0)
			}),

		general_info: yup.object({
			results: yup
				.string()
				.trim()
				.when('question_type', {
					is: (val) => val === 'poll',
					then: (schema) =>
						schema.required('You need to enter results in order to post'),
					otherwise: (schema) => schema
				}),
			positive_results: yup
				.string()
				.trim()
				.when('question_type', {
					is: (val) => val === 'quiz',
					then: (schema) =>
						schema.required(
							'You need to enter positive results in order to post'
						),
					otherwise: (schema) => schema
				}),
			negative_results: yup
				.string()
				.trim()
				.when('question_type', {
					is: (val) => val === 'quiz',
					then: (schema) =>
						schema.required(
							'You need to enter negative results in order to post'
						),
					otherwise: (schema) => schema
				})
		}),

		questions: questionsSlideSchema
	});

// V2 is without summary component and without trivia component
export const questionsFormValidationSchemaV2 =
	advancedSettingsValidationSchemaQuestions.shape({
		questions: questionsSlideSchema
	});

// V3 is with summary component and with Trivia Component
export const questionsFormValidationSchemaV3 =
	advancedSettingsValidationSchemaQuestions.shape({
		coverImageUploadedFiles: yup
			.array()
			.min(1, 'You need to upload an image in order to post'),
		resultsUploadedFiles: yup.array().when('general_info.question_type', {
			is: (val) => val === 'poll',
			then: (schema) =>
				schema.min(1, 'You need to upload an image in order to post'),
			otherwise: (schema) => schema.min(0)
		}),
		positiveResultsUploadedFiles: yup
			.array()
			.when('general_info.question_type', {
				is: (val) => val === 'quiz',
				then: (schema) =>
					schema.min(1, 'You need to upload an image in order to post'),
				otherwise: (schema) => schema.min(0)
			}),
		negativeResultsUploadedFiles: yup
			.array()
			.when('general_info.question_type', {
				is: (val) => val === 'quiz',
				then: (schema) =>
					schema.min(1, 'You need to upload an image in order to post'),
				otherwise: (schema) => schema.min(0)
			}),

		general_info: yup.object({
			question_title: yup
				.string()
				.trim()
				.required('You need to enter title in order to post'),
			results: yup
				.string()
				.trim()
				.when('question_type', {
					is: (val) => val === 'poll',
					then: (schema) =>
						schema.required('You need to enter results in order to post'),
					otherwise: (schema) => schema
				}),
			positive_results: yup
				.string()
				.trim()
				.when('question_type', {
					is: (val) => val === 'quiz',
					then: (schema) =>
						schema.required(
							'You need to enter positive results in order to post'
						),
					otherwise: (schema) => schema
				}),
			negative_results: yup
				.string()
				.trim()
				.when('question_type', {
					is: (val) => val === 'quiz',
					then: (schema) =>
						schema.required(
							'You need to enter negative results in order to post'
						),
					otherwise: (schema) => schema
				})
		}),

		questions: questionsSlideSchema
	});

export const getQuestionsValidationSchema = (
	isSummaryComponent,
	isTriviaEnabled
) => {
	if (isSummaryComponent && isTriviaEnabled)
		return questionsFormValidationSchemaV3;
	if (isSummaryComponent && !isTriviaEnabled)
		return questionsFormValidationSchemaV1;
	if (!isSummaryComponent && !isTriviaEnabled)
		return questionsFormValidationSchemaV2;
};

export const calculateAnswerPercentage = (totalParticipants, usersCount) => {
	return totalParticipants !== 0
		? Math.round(usersCount / totalParticipants) * 100
		: 0;
};

/**
 * QUESTION GENERATOR HELPER METHODS
 */

// default quiz generator option
export const defaultOption = { name: 'Random' };

// default quiz generator stae
export const defaultState = {
	league: 'Random',
	team: 'Random',
	player: 'Random',
	year: 'Random',
	stat: 'Random',
	mode: 'teams'
};

// format options for dropdowns
export const formatOptions = (options) => {
	if (!Array.isArray(options)) return [defaultOption];
	let results = options?.map((item) => {
		return { name: item };
	});
	return addDefaultOption(results);
};

// add default options to dropdown filter
export const addDefaultOption = (list) => {
	if (!Array.isArray(list)) return;
	return [defaultOption, ...list];
};

// Replaced Locked Questions

export const replaceLockedQuestion = (currentQuestions, newQuestions) => {
	const result = [];

	// Make deep copies of the input arrays
	currentQuestions = JSON.parse(JSON.stringify(currentQuestions));
	newQuestions = JSON.parse(JSON.stringify(newQuestions));

	for (let i = 0; i < currentQuestions.length; i++) {
		const currentQuestion = currentQuestions[i];

		if (currentQuestion?.isLocked) {
			result.push(currentQuestion);
		} else {
			const newQuestion = newQuestions.pop();

			if (newQuestion) {
				result.push(newQuestion);
			} else {
				// If no new question is found, delete the current question
				currentQuestions.splice(i, 1);
				i--;
			}
		}
	}

	// If the result array has fewer than 10 items, add remaining questions from newQuestions
	while (newQuestions.length > 0 && result.length < 10) {
		result.push(newQuestions.pop());
	}

	return result;
};

// export const replaceLockedQuestion = (
// 	currentQuestions = [],
// 	newQuestions = []
// ) => {
// 	currentQuestions = Array.isArray(currentQuestions) ? currentQuestions : [];
// 	newQuestions = Array.isArray(newQuestions) ? newQuestions : [];
// 	let newArray = newQuestions.slice();
// 	for (let i = 0; i < currentQuestions.length; i++) {
// 		if (
// 			Object.prototype.hasOwnProperty.call(currentQuestions[i], 'isLocked') &&
// 			currentQuestions[i].isLocked
// 		) {
// 			if (i < newArray.length) {
// 				newArray[i] = currentQuestions[i];
// 				if (newArray.length < 10) {
// 					newQuestions[i] && newArray.push(newQuestions[i]);
// 				}
// 			} else {
// 				newArray.push(currentQuestions[i]);
// 			}
// 		}
// 	}
// 	return newArray;
// };

export const disableGenerateQuestions = (values) => {
	let count = 0;
	for (let i = 0; i < values.length; i++) {
		if (
			(Object.prototype.hasOwnProperty.call(values[i], 'isLocked') &&
				!values[i].isLocked) ||
			!Object.prototype.hasOwnProperty.call(values[i], 'isLocked')
		) {
			return false;
		}
		count += 1;
	}

	return count === 10 ? true : false;
};
