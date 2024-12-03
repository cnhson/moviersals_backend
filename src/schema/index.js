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
  increaseEpisodeViewParams: ["movieid", "episodeid"],
};

export const livestreamSchema = {
  createLivestream_Params: ["roomname", "creator", "description", "ispremium", "path"],
  editLivestream_Params: ["id,roomname", "description", "ispremium"],
  endLivestream_Params: ["id", "roomname", "creator", "isstreaming"],
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
  createSubcription_Params: ["subcriptionid", "name", "amount", "daysduration"],
  editSubcription_Params: ["subcriptionid", "name", "amount", "daysduration"],
};

export const commentSchema = {
  createCommentParams: ["movieid", "content", "rating"],
  editCommentParams: ["id", "movieid", "content", "rating"],
  deleteCommentParams: ["id", "movieid"],
};

export const favouriteSchema = {
  addFavouriteEpisodeParams: ["movieid", "episodeid"],
  checlFavouriteEpisodeParams: ["movieid", "episodeid"],
  deleteFavouriteEpisodeCommentParams: ["id", "movieid", "episodeid"],
};
