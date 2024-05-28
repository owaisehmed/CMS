import React, { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { isEmpty } from 'lodash';
import Table from '../../components/ui/Table';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import ArticleBuilderForm from '../../components/forms/ArticleForm/ArticleBuilderForm';
import useGetAllArticlesQuery from '../../hooks/libraries/articles/useGetAllArticlesQuery';
import {
	getSpecificArticle,
	getSpecificArticleTemplateThunk
} from '../../data/features/articleLibrary/articleLibrarySlice';
import { getAllNewLabels } from '../../data/features/postsLibrary/postsLibrarySlice';
import { articleTableColumns } from '../../data/helpers/articleHelpers/index';
import ArticleTemplateForm from '../../components/forms/ArticleForm/ArticleTemplateForm';
import ArticleTemplatesModal from '../../components/ui/modals/ArticleTemplatesModal';
import NotificationForm from '../../components/forms/NotificationForm';

/**
 * ArticleLibrary Component serves as the starting point for the complete flow of the articles library.
 * It uses the DashboardLayout, Table, ArticleBuilderForm, and ArticleTemplateForm components.
 * With that it manages states and behaviours for the above mentioned components.
 * @component
 */
const ArticleLibrary = () => {
	const dispatch = useDispatch();

	const { data, isLoading, totalRecords } = useGetAllArticlesQuery();

	// ARTICLE BUILDER FORM STATES
	const [showSlider, setShowSlider] = useState(false);
	const [edit, setEdit] = useState(false);
	const [rowStatus, setRowStatus] = useState('');

	// ARTICLE TEMPLATE STATES
	const [showTemplateModal, setShowTemplateModal] = useState(false);
	const [showTemplateSlider, setShowTemplateSlider] = useState(false);

	/**
	 * @type {string}
	 * @description The selectedOption state will contain either one of the three values,
	 * which are "", "article", and "template". If it is any empty string then it identifes
	 * that neither one of the option is selected.
	 */
	const [selectedOption, setSelectedOption] = useState('');

	const handleRowClick = (_, row) => {
		row.status === 'draft' && dispatch(getAllNewLabels());
		dispatch(getSpecificArticle(row.id));
		setEdit(true);
		setShowSlider(true);
		setRowStatus(row?.status);
		setSelectedOption('article');
	};

	/**
	 * @function
	 * This method is responsible for opening up the ArticleTemplatesModal in the state
	 * where we can either create new article from scratch or build one from a template.
	 */
	const handleUploadArticleClick = useCallback(() => {
		setSelectedOption('article');
		setEdit(false);
		setRowStatus('');
		setShowTemplateModal(true);
	}, []);

	/**
	 * @function
	 * This method is responsible for opening up the ArticleTemplatesModal in the state
	 * where we can either create new template from scratch or edit an existing template.
	 */
	const handleUploadTemplateClick = useCallback(() => {
		setSelectedOption('template');
		setEdit(false);
		setRowStatus('');
		setShowTemplateModal(true);
	}, []);

	/**
	 * @function
	 * @param {data} - It identifies that if the data is present than we need to fetch that specfic template,
	 * otherwise we need to open the either one of the form in the create mode.
	 */
	const handleTemplateCardClick = useCallback(
		(data) => {
			if (!isEmpty(data)) {
				dispatch(getSpecificArticleTemplateThunk(data.id));
			}

			dispatch(getAllNewLabels());
			setShowTemplateModal(false);
			setEdit(selectedOption === 'template' && !isEmpty(data) ? true : false);

			selectedOption === 'article'
				? setShowSlider(true)
				: setShowTemplateSlider(true);
		},
		[selectedOption]
	);

	return (
		<DashboardLayout
			title='Article'
			isLoading={isLoading}
			onButtonClick={handleUploadArticleClick}
			secondaryButtonText={'Templates'}
			secondaryButtonClick={handleUploadTemplateClick}
		>
			<Table
				onRowClick={handleRowClick}
				columns={articleTableColumns}
				data={data}
				totalRecords={totalRecords}
				isLoading={isLoading}
				noDataText='No Articles Found'
			/>
			<ArticleTemplatesModal
				isEdit={edit}
				status={rowStatus}
				selectedOption={selectedOption}
				showTemplateModal={showTemplateModal}
				setShowTemplateModal={setShowTemplateModal}
				onTemplateCardClick={handleTemplateCardClick}
			/>
			<ArticleBuilderForm
				open={showSlider}
				handleClose={() => setShowSlider(false)}
				isEdit={edit}
				status={rowStatus}
				selectedOption={selectedOption}
			/>
			<ArticleTemplateForm
				open={showTemplateSlider}
				handleClose={() => setShowTemplateSlider(false)}
				isEdit={edit}
				status={rowStatus}
				selectedOption={selectedOption}
			/>
			<NotificationForm />
		</DashboardLayout>
	);
};

export default ArticleLibrary;
