const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const searchButton = document.getElementById('searchButton');
const gallery = document.getElementById('gallery');
const videoSection = document.getElementById('videoSection');
const videoGallery = document.getElementById('videoGallery');
const statusMessage = document.getElementById('status');
const detailModal = document.getElementById('detailModal');
const modalMedia = document.getElementById('modalMedia');
const modalDate = document.getElementById('modalDate');
const modalTitle = document.getElementById('modalTitle');
const modalExplanation = document.getElementById('modalExplanation');
const spaceFact = document.getElementById('spaceFact');

const apiKey = 'h8PNgnbTDnKWLkkwz9HhFrdbqhFwFRMNhL7jdFjK';
const apiUrl = 'https://api.nasa.gov/planetary/apod';
let galleryImages = [];
let lastFactIndex = -1;

const spaceFacts = [
	'One day on Venus is longer than one year on Venus.',
	'Jupiter is so large that more than 1,300 Earths could fit inside it.',
	'Neutron stars can spin around 600 times every second.',
	'Footprints on the Moon can last for millions of years because there is no wind.',
	'Light from the Sun takes about eight minutes and 20 seconds to reach Earth.',
	'Saturn would float in water because its average density is lower than water.',
	'There are more stars in the universe than grains of sand on all of Earth\'s beaches.',
	'The largest volcano in the solar system, Olympus Mons, is on Mars.'
];

// Call the setupDateInputs function from dateRange.js
// This sets up the date pickers to:
// - Default to a range of 9 days (from 9 days ago to today)
// - Restrict dates to NASA's image archive (starting from 1995)
setupDateInputs(startInput, endInput);
showRandomFact();

searchButton.addEventListener('click', getSpaceImages);
gallery.addEventListener('click', handleGalleryClick);
detailModal.addEventListener('click', (event) => {
	if (event.target.hasAttribute('data-close-modal')) {
		closeModal();
	}
});
document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape') {
		closeModal();
	}
});

getSpaceImages();

async function getSpaceImages() {
	const startDate = startInput.value;
	const endDate = endInput.value;

	if (!startDate || !endDate || startDate > endDate) {
		showStatus('Choose a valid date range to continue.', 'error');
		return;
	}

	searchButton.disabled = true;
	searchButton.textContent = 'Scanning the skies...';
	showStatus('Loading views from the universe...', 'loading');
	gallery.innerHTML = '';

	const params = new URLSearchParams({
		api_key: apiKey,
		start_date: startDate,
		end_date: endDate
	});

	try {
		const response = await fetch(`${apiUrl}?${params}`);

		if (!response.ok) {
			throw new Error('NASA could not return these images right now.');
		}

		const images = await response.json();
		const sortedImages = Array.isArray(images) ? images.reverse() : [images];
		await renderGallery(sortedImages);
		showRandomFact();
		showStatus(`${sortedImages.length} cosmic view${sortedImages.length === 1 ? '' : 's'} found`, 'success');
	} catch (error) {
		gallery.innerHTML = '<div class="placeholder"><div class="placeholder-icon">!</div><p>We could not reach NASA right now. Check your connection and try again.</p></div>';
		showStatus(error.message, 'error');
	} finally {
		searchButton.disabled = false;
		searchButton.textContent = 'Explore APODs';
	}
}

function showRandomFact() {
	let factIndex = Math.floor(Math.random() * spaceFacts.length);

	while (spaceFacts.length > 1 && factIndex === lastFactIndex) {
		factIndex = Math.floor(Math.random() * spaceFacts.length);
	}

	lastFactIndex = factIndex;
	spaceFact.textContent = spaceFacts[factIndex];
}

async function renderGallery(images) {
	const imageItems = images.filter((image) => image.media_type === 'image');
	const videoItems = images.filter((image) => image.media_type === 'video');
	galleryImages = imageItems;
	const cards = await Promise.all(imageItems.map(async (image, index) => {
		const mediaUrl = image.media_type === 'image' && isPlaceholderUrl(image.url)
			? await findArchiveImage(image.title, index)
			: image.url;
		image.displayUrl = mediaUrl;
		const media = image.media_type === 'video'
			? `<a class="video-preview" href="${image.url}" target="_blank" rel="noopener">Watch video</a>`
			: mediaUrl
				? `<img src="${mediaUrl}" alt="${escapeHtml(image.title)}" loading="lazy">`
				: '<div class="video-preview">Image unavailable</div>';

		return `<article class="gallery-item" data-image-index="${index}" tabindex="0" role="button" aria-label="View details for ${escapeHtml(image.title)}">
			<div class="media-frame">${media}</div>
			<div class="item-content">
				<p class="item-date">${image.date}</p>
				<h2>${escapeHtml(image.title)}</h2>
			</div>
		</article>`;
	}));

	gallery.innerHTML = cards.length > 0
		? cards.join('')
		: '<div class="placeholder"><div class="placeholder-icon">!</div><p>No image entries were found for this date range.</p></div>';
	renderVideos(videoItems);
}

function renderVideos(videos) {
	videoGallery.innerHTML = videos.length === 0
		? '<p class="no-video-message">No video media found</p>'
		: videos.map((video) => `<article class="video-card">
		<div class="video-card-info">
			<div class="video-thumbnail">
				${video.thumbnail_url
					? `<img src="${escapeHtml(video.thumbnail_url)}" alt="">`
					: '<span aria-hidden="true">▶</span>'}
			</div>
			<div>
			<p class="item-date">${video.date}</p>
			<h3>${escapeHtml(video.title)}</h3>
			</div>
		</div>
		<a class="video-link" href="${escapeHtml(video.url)}" target="_blank" rel="noopener">Watch video <span aria-hidden="true">↗</span></a>
	</article>`).join('');
}

function handleGalleryClick(event) {
	const card = event.target.closest('.gallery-item');
	if (card) {
		openModal(Number(card.dataset.imageIndex));
	}
}

function openModal(index) {
	const image = galleryImages[index];
	if (!image) return;

	modalDate.textContent = image.date;
	modalTitle.textContent = image.title;
	modalExplanation.textContent = image.explanation;
	modalMedia.innerHTML = image.media_type === 'video'
		? `<a class="video-preview" href="${image.url}" target="_blank" rel="noopener">Watch video</a>`
		: `<img src="${image.displayUrl || image.url}" alt="${escapeHtml(image.title)}">`;
	detailModal.classList.add('is-open');
	detailModal.setAttribute('aria-hidden', 'false');
	detailModal.querySelector('.modal-close').focus();
}

function closeModal() {
	detailModal.classList.remove('is-open');
	detailModal.setAttribute('aria-hidden', 'true');
}

function isPlaceholderUrl(url = '') {
	return url.includes('nasa-logo');
}

async function findArchiveImage(title, index) {
	try {
		const params = new URLSearchParams({
			q: title,
			media_type: 'image',
			page: String(index + 1)
		});
		const response = await fetch(`https://images-api.nasa.gov/search?${params}`);
		const data = await response.json();
		return data.collection.items[0]?.links?.find((link) => link.render === 'image')?.href || null;
	} catch (error) {
		return null;
	}
}

function showStatus(message, type) {
	statusMessage.textContent = message;
	statusMessage.className = `status ${type}`;
}

function escapeHtml(text = '') {
	return text.replace(/[&<>'"]/g, (character) => ({
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		"'": '&#39;',
		'"': '&quot;'
	}[character]));
}
