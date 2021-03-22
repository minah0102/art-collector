const BASE_URL = "https://api.harvardartmuseums.org";
const KEY = "apikey=a626c1de-026f-41aa-9af9-4dcbb26d294e";

async function fetchObjects() {
  const url = `${BASE_URL}/object?${KEY}`;
  onFetchStart();
  try {
    const response = await fetch(url);
    const data = await response.json();

    return data;
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
}

fetchObjects().then((x) => console.log(x));

async function fetchAllCenturies() {
  const url = `${BASE_URL}/century?${KEY}&size=100&sort=temporalorder`;
  onFetchStart();
  try {
    const response = await fetch(url);
    const { info, records } = await response.json();
    localStorage.setItem("centuries", JSON.stringify(records));
    return records;
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }

  if (localStorage.getItem("centuries")) {
    return JSON.parse(localStorage.getItem("centuries"));
  }
}

async function fetchAllClassifications() {
  const url = `${BASE_URL}/classification?${KEY}&size=100&sort=name`;
  onFetchStart();
  try {
    const response = await fetch(url);
    const { info, records } = await response.json();
    localStorage.setItem("classifications", JSON.stringify(records));
    return records;
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }

  if (localStorage.getItem("classifications")) {
    return JSON.parse(localStorage.getItem("classifications"));
  }
}

async function prefetchCategoryLists() {
  try {
    const [classifications, centuries] = await Promise.all([
      fetchAllClassifications(),
      fetchAllCenturies(),
    ]);
    $(".classification-count").text(`(${classifications.length})`);
    classifications.forEach((classification) => {
      $("#select-classification").append(
        `<option value="${classification.name}">${classification.name}</option>`
      );
    });

    $(".century-count").text(`(${centuries.length})`);
    centuries.forEach((century) => {
      $("#select-century").append(
        $(`<option value="${century.name}">${century.name}</option>`)
      );
    });
  } catch (error) {
    console.error(error);
  }
}

function buildSearchString() {
  const selectClassification = $("#select-classification").val();
  const selectCentury = $("#select-century").val();
  const selectKeywords = $("#keywords").val();
  console.log(selectClassification, selectCentury, selectKeywords);

  const url = `${BASE_URL}/object?${KEY}&classification=${selectClassification}&century=${selectCentury}&keyword=${selectKeywords}`;
  const encodedUrl = encodeURI(url);

  return encodedUrl;
}

function onFetchStart() {
  $("#loading").addClass("active");
}

function onFetchEnd() {
  $("#loading").removeClass("active");
}

function renderPreview(record) {
  const { description, primaryimageurl, title } = record;

  if (primaryimageurl !== undefined) {
    return $(`
    <div class="object-preview">
      <a href="#">
        <img src="${primaryimageurl}" />
        <h3>${title}</h3>
        <h3>${description}</h3>
      </a>
    </div>
    `).data("record", record);
  }
}

function updatePreview(records, info) {
  const root = $("#preview");
  const results = $(".results");
  const resultEl = root.find(results)
  resultEl.empty();
  
  records.forEach((record) => {
    resultEl.append(renderPreview(record));
  });

  if (info.next) {
    root.find(".next").data("url", info.next).attr("disabled", false);
  } else {
    root.find(".next").data("url", null).attr("disabled", true);
  }

  if (info.prev) {
    root.find(".previous").data("url", info.prev).attr("disabled", false);
  } else {
    root.find(".previous").data("url", null).attr("disabled", true);
  }
}

function renderFeature(record) {
  const {
    title,
    dated,
    description,
    culture,
    style,
    technique,
    medium,
    dimensions,
    people,
    department,
    division,
    contact,
    creditline,
    images,
    primaryimageurl,
  } = record;
  return $(`<div class="object-feature">
  <header>
  <h3>${title}</h3>
  <h4>${dated}</h4>
</header>
<section class="facts">
  ${factHTML("Description", description)}
  ${factHTML("Culture", culture)}
  ${factHTML("Style", style)}
  ${factHTML("Technique", technique)}
  ${factHTML("Medium", medium)}
  ${factHTML("Dimension", dimensions)}
  ${
    people
      ? people
          .map((person) => {
            return factHTML("Person", person.displayname, "person");
          })
          .join("")
      : ""
  }
  ${factHTML("Deparment", department)}
  ${factHTML("Division", division)}
  ${factHTML(
    "Contact",
    `<a target="_blank" href="mailto:${contact}">${contact}</a>`
  )}
  ${factHTML("Creditline", creditline)}
</section>
<section class="photos">
${photosHTML(images, primaryimageurl)}
</section>
  </div>`);
}

function searchURL(searchType, searchString) {
  return `${BASE_URL}/object?${KEY}&${searchType}=${searchString}`;
}

function factHTML(title, content, searchTerm = null) {
  if (!content) {
    return "";
  } else if (!searchTerm) {
    return `<span class="title">${title}</span>
    <span class="content">${content}</span>`;
  } else {
    return `<span class="title">${title}</span>
    <span class="content">
    <a href="${API.ROOT}/${API.RESOURCES.OBJECT}?${
      API.KEY
    }&${searchTerm}=${encodeURI(content.split("-").join("|"))}>
    ${content}</span>`;
  }
}

function photosHTML(images, primaryimageurl) {
  if (images.length > 0) {
    return images
      .map((image) => `<img src="${image.baseimageurl}" />`)
      .join("");
  } else if (primaryimageurl) {
    return `<img src="${primaryimageurl}" />`;
  } else {
    return "";
  }
}

$("#search").on("submit", async function (event) {
  event.preventDefault();
  onFetchStart();

  try {
    const response = await fetch(buildSearchString());
    const { records, info } = await response.json();
    updatePreview(records, info);
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
});

$("#preview .next, #preview .previous").on("click", async function () {
  onFetchStart();
  try {
    const url = $(this).data("url");
    const response = await fetch(url);
    const { record, info } = await response.json();
    updatePreview(records, info);
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
});

$("#preview").on("click", ".object-preview", function (event) {
  event.preventDefault();
  const objectRecord = $(this).data("objectRecord");

  $("#feature").html(renderObjectRecordFeature(objectRecord));
});

$("#feature").on("click", "a", async function (event) {
  const href = $(this).attr("href");
  if (href.startsWith("mailto:")) {
    return;
  }
  event.preventDefault();
  onFetchStart();
  try {
    let result = await fetch(href);
    let { records, info } = await result.json();
    updatePreview(records, info);
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
});
prefetchCategoryLists();
