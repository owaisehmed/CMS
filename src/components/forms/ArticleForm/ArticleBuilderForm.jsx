import React, { useRef, useState, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Formik, Form } from 'formik';
import { isEmpty, omit } from 'lodash';
import DeleteModal from '../../ui/modals/DeleteModal';
import ArticleFormDrawer from './subComonents/ArticleFormDrawer';
import { useCommonParams } from '../../../hooks';
import { ArticleLibraryService } from '../../../data/services';
import {
	selectSpecificArticle,
	selectSpecificArticleTemplate
} from '../../../data/selectors/articleLibrarySelectors';
import {
	articleFormInitialValues,
	articleFormValidationSchema,
	articleDataFormatterForForm,
	articleDataFormatterForService,
	uploadArticleFiles
} from '../../../data/helpers/articleHelpers/index';
import {
	getAllArticlesApi,
	createOrEditArticleThunk,
	deleteArticleThunk,
	getArticleSubCategories
} from '../../../data/features/articleLibrary/articleLibrarySlice';
import { getRules } from '../../../data/selectors';

/**
 * ArticleBuilderForm component is used as a child of the ArticleLibrary and the link to that is given below.
 * ArticleBuilderForm serves the purpose of a form wrapper component which is using formik for the creation, editing, and deletion of articles.
 * @component
 * @see {@link http://127.0.0.1:5500/docs/ArticleLibrary.html|ArticleLibrary}
 */
const ArticleBuilderForm = ({
	open,
	handleClose,
	isEdit,
	status,
	selectedOption
}) => {
	const navigate = useNavigate();
	const dispatch = useDispatch();
	const { queryParams, isSearchParamsEmpty } = useCommonParams();

	// Selectors
	const specificArticle = useSelector(selectSpecificArticle);
	const specificArticleTemplate = useSelector(selectSpecificArticleTemplate);
	const { rules } = useSelector(getRules);

	// Refs
	const dialogWrapper = useRef(null);

	// States
	const [openDeleteModal, setOpenDeleteModal] = useState(false);

	useEffect(() => {
		if (specificArticle?.main_category_id)
			dispatch(getArticleSubCategories(specificArticle.main_category_id));
	}, [specificArticle, specificArticleTemplate]);

	/**
	 * @type {object}
	 * @description initialValues object hold the inital data of formik form
	 */
	const initialValues = useMemo(() => {
		if (!isEmpty(specificArticleTemplate) && !isEdit)
			return articleDataFormatterForForm(
				omit(specificArticleTemplate, ['id']),
				rules
			);

		if (isEdit && !isEmpty(specificArticle)) {
			return articleDataFormatterForForm(specificArticle, rules);
		} else {
			return articleFormInitialValues(rules);
		}
	}, [isEdit, specificArticle, rules, specificArticleTemplate]);

	const toggleDeleteModal = () => setOpenDeleteModal(!openDeleteModal);

	/**
	 * @function
	 * onSubmitHandler is responsbile for creating or editing an article.
	 * @param {Object} values - Formik form values.
	 * @param {Object} formikBag - Formik bag object which has all the utilities provided by formik.
	 */
	const onSubmitHandler = async (values, formikBag) => {
		const isDraft = values.save_draft;
		const isScheduled = values.is_scheduled;

		const { setSubmitting, setFieldValue, setFieldError } = formikBag;

		setSubmitting(true);

		// Title duplicate check cases
		const isScheduleEnabledAndChanged =
			isScheduled && specificArticle?.is_scheduled !== isScheduled;

		const isPublishedOrScheduledAndTitleModified =
			(!isDraft || isScheduled) && specificArticle?.title !== values.title;

		const isDraftChangingToPublishAndScheduleDisable =
			!isDraft && status === 'draft' && !specificArticle?.is_scheduled;

		const shouldCheckTitleDuplication =
			isScheduleEnabledAndChanged ||
			isPublishedOrScheduledAndTitleModified ||
			isDraftChangingToPublishAndScheduleDisable;

		try {
			if (shouldCheckTitleDuplication) {
				const { data } = await ArticleLibraryService.getArticleCheckTitle(
					values.title
				);

				if (data.response) {
					setSubmitting(false);
					setFieldError(
						'title',
						'An article item with this Title has already been published. Please amend the Title.'
					);

					const titleField = document.querySelector("[name='title']");
					if (titleField) titleField.focus();
					return;
				}
			}

			const { uploadedFilesRes, elements } = await uploadArticleFiles(values);

			const articleData = articleDataFormatterForService(
				{ ...values, elements },
				uploadedFilesRes,
				rules
			);

			const { type } = await dispatch(createOrEditArticleThunk(articleData));

			if (type === 'articleLibary/createOrEditArticleThunk/fulfilled') {
				handleClose();

				if (isEdit && !(status === 'draft' && isDraft === false)) {
					dispatch(getAllArticlesApi(queryParams));
				} else if (isSearchParamsEmpty) {
					dispatch(getAllArticlesApi());
				} else {
					navigate('/article-library');
				}
			}
		} catch (e) {
			console.error(e);
		} finally {
			setSubmitting(false);
			setFieldValue('save_draft', true, false);
			setFieldValue(
				'is_scheduled',
				specificArticle?.is_scheduled || false,
				false
			);
		}
	};

	/**
	 * @function
	 * onDeleteHandler is responsbile for the deletion of an article.
	 * @param {string} id - Id of the article
	 * @param {boolean} isDraft - isDraft status of a article
	 * @param {Function} setSubmitting - Formik bag function to change submitting state
	 */
	const onDeleteHandler = async (id, isDraft, setSubmitting) => {
		setSubmitting(true);
		setOpenDeleteModal(false);
		try {
			await dispatch(
				deleteArticleThunk({
					article_id: id,
					is_draft: isDraft
				})
			);

			handleClose();
			dispatch(getAllArticlesApi(queryParams));
		} catch (e) {
			console.error(e);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Formik
			initialValues={initialValues}
			validationSchema={articleFormValidationSchema}
			onSubmit={onSubmitHandler}
			enableReinitialize
			validateOnMount
		>
			{({ setSubmitting, isSubmitting }) => (
				<Form>
					<ArticleFormDrawer
						open={open}
						handleClose={handleClose}
						isEdit={isEdit}
						status={status}
						selectedOption={selectedOption}
						onSubmitHandler={onSubmitHandler}
						toggleDeleteModal={toggleDeleteModal}
					/>
					<DeleteModal
						open={openDeleteModal}
						toggle={toggleDeleteModal}
						deleteBtn={() => {
							onDeleteHandler(specificArticle?.id, status, setSubmitting);
						}}
						text={'Article'}
						wrapperRef={dialogWrapper}
						isSubmitting={isSubmitting}
					/>
				</Form>
			)}
		</Formik>
	);
};

ArticleBuilderForm.propTypes = {
	open: PropTypes.bool.isRequired,
	handleClose: PropTypes.func.isRequired,
	isEdit: PropTypes.bool.isRequired,
	status: PropTypes.string.isRequired,
	selectedOption: PropTypes.oneOf(['', 'article', 'template']).isRequired
};

export default ArticleBuilderForm;
