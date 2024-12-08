export const accountSchema = {
  loginAccountParams: ["username", "password"],
  changePasswordParams: ["oldpassword", "newpassword"],
  editAccountParams: ["displayname", "email", "phonenumber"],
  createAccountParams: ["username", "password", "displayname", "email", "phonenumber"],
  createEmailVerificationParams: ["email"],
  verifyEmailVerificationParams: ["email", "emailtoken"],
  createResetPasswordToken: ["email"],
  checkResetPasswordToken: ["passwordtoken"],
  verifyResetPassword: ["newpassword", "passwordtoken"],
  changeAccountActiveState_Params: ["id", "username", "isactive"],
};

export const movieSchema = {
  getMovieDetailParams: ["movieid"],
  getMovieEpisodeParams: ["movieid", "episodeid"],
  createMovieInfo_Params: ["name", "description", "publisher", "publishyear", "categories", "type", "ispremium"],
  editMovieInfo_Params: ["movieid", "name", "description", "publisher", "publishyear", "categories", "type", "ispremium"],
  deleteMovieInfo_Params: ["movieid"],
  categoriesFilterParams: ["categories"],
};

export const episodeSchema = {
  uploadEpisode_Params: ["movieid", "name", "episodenumber", "episodepath"],
  editEpisode_Params: ["movieid", "episodenumber", "episodepath"],
  deleteEpisode_Params: ["movieid", "episodeid", "episodenumber"],
  increaseEpisodeViewParams: ["movieid", "episodenumber"],
};

export const livestreamSchema = {
  createLivestream_Params: ["roomname", "creator", "description", "ispremium"],
  editLivestream_Params: ["id", "roomname", "description", "ispremium", "isstreaming", "path"],
  getLiveStream_Params: ["id", "roomid"],
  increaseviewLivestream_Params: ["id", "view"],
};

export const orderSchema = {
  // id: paypal order id sent from frontend button
  createPaypalOrderParams: ["id", "subcriptionid", "amount", "email", "payerid"],
  createVNPayTransactionParams: ["subcriptionid", "amount"],
  getOrderPaymentDetailParams: ["paymentmethod", "paymentid"],
};

export const subcriptionSchema = {
  getSubcriptionDetailParams: ["subcriptionid"],
  createSubcription_Params: ["subcriptionid", "name", "price", "daysduration", "baseprice", "priority", "quality", "connection"],
  editSubcription_Params: ["subcriptionid", "name", "price", "daysduration", "baseprice", "priority", "quality", "connection"],
  deleteSubcription_Params: ["subcriptionid"],
};

export const commentSchema = {
  createCommentParams: ["movieid", "content", "rating"],
  editCommentParams: ["id", "movieid", "content", "rating"],
  deleteCommentParams: ["id", "movieid"],
};

export const favouriteSchema = {
  addFavouriteEpisodeParams: ["movieid", "episodenumber"],
  checkFavouriteEpisodeParams: ["movieid", "episodenumber"],
  deleteFavouriteEpisodeCommentParams: ["movieid", "episodenumber"],
};

export const categorieSchema = {
  createCategorie_Params: ["name", "namevi"],
  editCategorie_Params: ["id", "name", "namevi"],
  deleteCategories_Params: ["id", "name"],
};

export const statisticSchema = {
  getRevenue_Params: ["startdate", "enddate"],
  getUser_Params: ["startdate", "enddate"],
};
