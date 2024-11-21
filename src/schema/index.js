export const accountSchema = {
  loginAccountParams: ["username", "password"],
  changePasswordParams: ["oldpassword", "newpassword"],
  editAccountParams: ["displayname", "email", "phonenumber"],
  createAccountParams: ["username", "password", "displayname", "email", "phonenumber"],
  verifyEmailParams: ["emailtoken"],
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
  uploadEpisode_Params: ["movieid", "episodenumber", "episodepath"],
  editEpisode_Params: ["movieid", "episodenumber", "episodepath"],
  increaseEpisodeViewParams: ["movieid", "episodenumber", "episodepath"],
};

export const livestreamSchema = {
  createLivestream_Params: ["roomname", "creator", "description", "ispremium", "path"],
  editLivestream_Params: ["id,roomname", "description", "ispremium"],
  endLivestream_Params: ["id", "roomname", "creator", "isstreaming"],
  increaseviewLivestream_Params: ["id", "view"],
};
