import axios from "axios";

/**
 * Client for Unsplash API
 */
export default class UnsplashClient {
  constructor(config) {
    this.apiUrl =
      config && config.apiUrl ? config.apiUrl : "https://api.unsplash.com";
    this.clientId = config && config.clientId ? config.clientId : "";
    this.perPage = config && config.maxResults ? config.maxResults : 40;
    this.appName = config && config.appName ? config.appName : "";
    this.downloadParameters = config && config.downloadParameters ? config.downloadParameters : "";
  }

  search({
    query,
    page = 1,
    per_page,
    order_by = "relevant",
    orientation = "",
    color = "",
    callback = () => {},
  }) {
    
    // If we've got an unsplash URL, fake search by getting photo directly
    if (query.indexOf('https://unsplash.com/') !== -1) {
      const rx = /^https:\/\/unsplash.com\/.*-([\w]*)$/g
      const rxResult = rx.exec(query);
      if (rxResult[1] !== undefined) {
        axios.get(`${this.apiUrl}/photos/${rxResult[1]}`,
           {params:{client_id:this.clientId}})
           .then((response) =>
            callback(this.parseResults({results:[response.data], total:1, total_pages:1}, page, query))
          )
          .catch(() => callback([]));
      }
    }
    
    axios
      .get(`${this.apiUrl}/search/photos`, {
        params: {
          client_id: this.clientId,
          query,
          page,
          per_page: per_page || this.perPage,
          order_by,
          orientation: orientation ? orientation : null,
          color: color ? color : null,
        },
      })
      .then((response) =>
        callback(this.parseResults(response.data, page, query))
      )
      .catch((err) => {console.log(err);callback([])});
  }

  getUserPhotos({ username, page = 1, per_page, order_by = "latest", orientation = "", callback = () => {} }) {
    const actualPerPage = per_page || this.perPage;
    axios
      .get(`${this.apiUrl}/users/${username}/photos`, {
        params: {
          client_id: this.clientId,
          page,
          per_page: actualPerPage,
          order_by,
          orientation: orientation ? orientation : null,
        },
      })
      .then((response) => {
        const total = response.headers["x-total"] ? parseInt(response.headers["x-total"]) : 0;
        const total_pages = (total && actualPerPage) ? Math.ceil(total / actualPerPage) : 1;
        callback(
          this.parseResults(
            { results: response.data, total, total_pages },
            page,
            username
          )
        );
      })
      .catch((err) => {
        console.log(err);
        callback([]);
      });
  }

  searchCollections({ query, page = 1, per_page, callback = () => {} }) {
    axios
      .get(`${this.apiUrl}/search/collections`, {
        params: {
          client_id: this.clientId,
          query,
          page,
          per_page: per_page || this.perPage,
        },
      })
      .then((response) =>
        callback(this.parseCollectionResults(response.data, page, query))
      )
      .catch((err) => {
        console.log(err);
        callback([]);
      });
  }

  getCollectionPhotos({ collectionId, page = 1, per_page, orientation = "", callback = () => {} }) {
    const actualPerPage = per_page || this.perPage;
    axios
      .get(`${this.apiUrl}/collections/${collectionId}/photos`, {
        params: {
          client_id: this.clientId,
          page,
          per_page: actualPerPage,
          orientation: orientation ? orientation : null,
        },
      })
      .then((response) => {
        const total = response.headers["x-total"] ? parseInt(response.headers["x-total"]) : 0;
        const total_pages = (total && actualPerPage) ? Math.ceil(total / actualPerPage) : 1;
        callback(
          this.parseResults(
            { results: response.data, total, total_pages },
            page,
            collectionId
          )
        );
      })
      .catch((err) => {
        console.log(err);
        callback([]);
      });
  }

  parseResults({ total, total_pages, results }, page, query) {
    return {
      total,
      total_pages,
      page,
      next_page: total_pages > page ? page + 1 : null,
      previous_page: page > 1 ? page - 1 : null,
      query,
      results: results.map((image) => ({
        width: image.width,
        height: image.height,
        alt_description: image.alt_description,
        description: image.description,
        likes: image.likes,
        user: image.user,
        slug: image.slug,
        url: this.downloadParameters ? image.urls.raw + this.downloadParameters: image.urls.regular,
        regular_url: image.urls.regular,
        raw: image.urls.raw,
        thumb: image.urls.thumb,
        download_location: image.links.download_location,
        attribution: `Photo par <a href="${image.user.links.html}?utm_source=${this.appName}&utm_medium=referral">${image.user.name}</a> sur <a href="https://unsplash.com/?utm_source=${this.appName}&utm_medium=referral">Unsplash</a>`,
      })),
    };
  }

  parseCollectionResults({ total, total_pages, results }, page, query) {
    return {
      total,
      total_pages,
      page,
      next_page: total_pages > page ? page + 1 : null,
      previous_page: page > 1 ? page - 1 : null,
      query,
      results: results.map((collection) => ({
        id: collection.id,
        title: collection.title,
        total_photos: collection.total_photos,
        user: collection.user,
        cover_photo: collection.cover_photo,
        thumb: collection.cover_photo ? collection.cover_photo.urls.small : null,
        type: "collection",
      })),
    };
  }

  /**
   * Trigger an image download, as Unsplash API requires it when embedding
   * @param {string} downloadLocation
   */
  download(downloadLocation) {
    axios
      .get(downloadLocation, {
        params: {
          client_id: this.clientId,
        },
      })
      .catch((error) => console.log(error));
  }
}
