import React, { useRef, useState, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Formik, Form } from 'formik';
import { isEmpty } from 'lodash';
import DeleteModal from '../../ui/modals/DeleteModal';
import ArticleFormDrawer from './subComonents/ArticleFormDrawer';
import { useCommonParams } from '../../../hooks';
import { ArticleLibraryService } from '../../../data/services';
import { selectSpecificArticleTemplate } from '../../../data/selectors/articleLibrarySelectors';
import {
	articleTemplateFormInitialValues,
	articleTemplateFormValidationSchema,
	articleDataFormatterForForm,
	articleTemplateDataFormatterForService,
	uploadArticleFiles
} from '../../../data/helpers/articleHelpers/index';
import {
	getAllArticleTemplatesThunk,
	createOrEditArticleTemplateThunk,
	deleteArticleTemplateThunk,
	getArticleSubCategories,
	setSpecificArticleStatus
} from '../../../data/features/articleLibrary/articleLibrarySlice';
import { getRules } from '../../../data/selectors';

/**
 * ArticleTemplateForm component is used as a child of the ArticleLibrary and the link to that is given below.
 * ArticleTemplateForm serves the purpose of a form wrapper component which is using formik for the creation, editing, and deletion of article templates.
 * @component
 * @see {@link http://127.0.0.1:5500/docs/ArticleLibrary.html|ArticleLibrary}
 */
const ArticleTemplateForm = ({
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
	const specificArticleTemplate = useSelector(selectSpecificArticleTemplate);
	const { rules } = useSelector(getRules);

	// Refs
	const dialogWrapper = useRef(null);

	// States
	const [openDeleteModal, setOpenDeleteModal] = useState(false);

	useEffect(() => {
		if (specificArticleTemplate?.main_category_id)
			dispatch(
				getArticleSubCategories(specificArticleTemplate.main_category_id)
			);
	}, [specificArticleTemplate]);

	/**
	 * @type {object}
	 * @description initialValues object hold the inital data of formik form
	 */
	const initialValues = useMemo(
		() =>
			isEdit && !isEmpty(specificArticleTemplate)
				? articleDataFormatterForForm(specificArticleTemplate, rules)
				: articleTemplateFormInitialValues(rules),
		[isEdit, specificArticleTemplate, rules]
	);

	const toggleDeleteModal = () => setOpenDeleteModal(!openDeleteModal);

	/**
	 * @function
	 * onSubmitHandler is responsbile for the creating or editing of article template.
	 * @param {Object} values - Formik form values.
	 * @param {Object} formikBag - Formik bag object which has all the utilities provided by formik.
	 */
	const onSubmitHandler = async (values, formikBag) => {
		dispatch(setSpecificArticleStatus('loading'));
		formikBag.setSubmitting(true);

		try {
			if (
				isEmpty(values.id) ||
				specificArticleTemplate?.template_name !== values.template_name
			) {
				const { data } = await ArticleLibraryService.articleTemplateCheckName(
					values.template_name
				);

				if (data.status_code === 200) {
					dispatch(setSpecificArticleStatus('success'));
					formikBag.setSubmitting(false);
					formikBag.setFieldError(
						'template_name',
						'An article template item with this Name has already been created. Please amend the Template Name.'
					);
					return;
				}
			}

			const { uploadedFilesRes, elements } = await uploadArticleFiles(values);

			const articleData = articleTemplateDataFormatterForService(
				{ ...values, elements },
				uploadedFilesRes,
				rules
			);

			const { type } = await dispatch(
				createOrEditArticleTemplateThunk(articleData)
			);

			if (type === 'articleLibary/createOrEditArticleTemplateThunk/fulfilled') {
				handleClose();

				if (isEdit) {
					dispatch(getAllArticleTemplatesThunk(queryParams));
				} else if (isSearchParamsEmpty) {
					dispatch(getAllArticleTemplatesThunk());
				} else {
					navigate('/article-library');
				}
			}
		} catch (e) {
			console.error(e);
		} finally {
			dispatch(setSpecificArticleStatus('success'));
			formikBag.setSubmitting(false);
		}
	};

	/**
	 * @function
	 * onDeleteHandler is responsbile for the deletion of an article template.
	 * @param {string} id - Id of the article
	 * @param {Function} setSubmitting - Formik bag function to change submitting state
	 */
	const onDeleteHandler = async (id, setSubmitting) => {
		setSubmitting(true);
		setOpenDeleteModal(false);
		try {
			await dispatch(deleteArticleTemplateThunk(id));
			handleClose();
			dispatch(getAllArticleTemplatesThunk(queryParams));
		} catch (e) {
			console.error(e);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Formik
			initialValues={initialValues}
			validationSchema={articleTemplateFormValidationSchema}
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
							onDeleteHandler(specificArticleTemplate?.id, setSubmitting);
						}}
						text={'Template'}
						wrapperRef={dialogWrapper}
						isSubmitting={isSubmitting}
					/>
				</Form>
			)}
		</Formik>
	);
};

ArticleTemplateForm.propTypes = {
	open: PropTypes.bool.isRequired,
	handleClose: PropTypes.func.isRequired,
	isEdit: PropTypes.bool.isRequired,
	status: PropTypes.string.isRequired,
	selectedOption: PropTypes.oneOf(['', 'article', 'template']).isRequired
};

export default ArticleTemplateForm;
