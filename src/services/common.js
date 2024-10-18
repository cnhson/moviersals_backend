// require("dotenv").config();

// // API pagination
// const pagination = {
//   currentPage: 1,
//   hasNext: false,
//   hasPrevious: false,
//   items: [],
//   pages: 1,
//   size: 0,
//   total: 0,
// };

// const checkNextAndPreviousPage = (page, totalPages) => {
//   let hasNext = false;
//   let hasPrevious = false;
//   // check if current page has next page and previous page
//   if (page === totalPages) {
//     hasNext = false;
//   }
//   if (page < totalPages) {
//     hasNext = true;
//   }
//   if (page > 1 && page <= totalPages) {
//     hasPrevious = true;
//   }

//   return { hasNext: hasNext, hasPrevious: hasPrevious };
// };

// export default { pagination, checkNextAndPreviousPage };
