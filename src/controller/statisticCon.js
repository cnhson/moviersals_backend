import { statisticSchema } from "../schema/index.js";
import { errorHandler, getPageSize, getQueryOffset, getTotalPages, preProcessingBodyParam, sendResponse } from "../util/index.js";

export const getRangeDateRevenue = errorHandler(async (req, res, next, client) => {
  const params = preProcessingBodyParam(req, statisticSchema.getRevenue_Params);
  const result = await client.query(
    ` select TO_CHAR(paymentdate::date, 'YYYY-MM-DD') AS reportdate,  SUM(t.amount)::int as amount
  	from tborderhistory t where t.paymentdate::date >= $1
  	and t.paymentdate::date <= $2 and t.status = 'PAID' group by paymentdate::date  
    order by reportdate asc`,
    [params.startdate, params.enddate]
  );
  const object = { list: result.rows };

  sendResponse(res, 200, "success", "success", object);
});

export const getTotalAmountRevenue = errorHandler(async (req, res, next, client) => {
  const result = await client.query(` SELECT SUM(t.amount) as total FROM tborderhistory t where t.status = 'PAID' `);
  sendResponse(res, 200, "success", "success", result.rows[0].total);
});

export const getTotalUser = errorHandler(async (req, res, next, client) => {
  const result = await client.query(` SELECT COUNT(t.id) as total FROM tbuserinfo t where t.role != 'admin' `);
  sendResponse(res, 200, "success", "success", result.rows[0].total);
});

export const getOtherStatistic = errorHandler(async (req, res, next, client) => {
  const limit = req.query.limit || 5;

  const result = await client.query(
    `WITH TopMovies AS (
    SELECT 
        t.name AS movie_name,
        SUM(t2.view) AS total_views
        FROM tbmovieinfo t
        JOIN tbmovieepisode t2 ON t.movieid = t2.movieid
        GROUP BY t.name
        ORDER BY SUM(t2.view) DESC
        LIMIT $1
    )
    SELECT 
        (SELECT SUM(t.amount) FROM tborderhistory t WHERE t.status = 'PAID') AS total_revenue,
        (SELECT COUNT(t.id) FROM tbuserinfo t WHERE t.role != 'admin') AS total_users,
        (SELECT COUNT(t.movieid) FROM tbmovieinfo t) AS total_movies,
        (SELECT COUNT(t.id) FROM tborderhistory t WHERE t.status = 'PAID') AS total_orders,
        (SELECT json_agg(
            json_build_object(
                'name', movie_name,
                'total_views', total_views
            )
        ) FROM TopMovies) AS top_views;`,
    [limit]
  );

  sendResponse(res, 200, "success", "success", { list: result.rows });
});

export const getFilterMostSeenMovie = errorHandler(async (req, res, next, client) => {
  const moviename = req.body.moviename || null;
  const descSort = req.body.descSort;

  const page = Number(req.body.page) || 1;
  const size = getPageSize();
  const offset = getQueryOffset(page);

  const result = await client.query(
    `WITH base_data AS (
        SELECT 
        t.id,
        t.name AS movie_name,
        COALESCE(SUM(t2.view), 0) AS total_views
        FROM tbmovieinfo t
        full JOIN tbmovieepisode t2 ON t.movieid = t2.movieid
        where
        ($3::text IS NULL OR t.name ILIKE CONCAT('%', $3, '%'))
        GROUP BY t.id
    ),
    total AS (
      SELECT COUNT(*) AS total_count FROM base_data
    ),
    data AS (
      SELECT * FROM base_data order by total_views ${descSort ? "DESC" : "ASC"}
      LIMIT $1 OFFSET $2
    )
    SELECT (SELECT total_count FROM total) AS total_count, json_agg(data) AS rows
    FROM data;`,
    [size, offset, moviename ? moviename : null]
  );

  const totalPages = getTotalPages(result.rows[0].total_count);
  const object = { list: result.rows[0].rows, total: totalPages };
  sendResponse(res, 200, "success", "success", object);
});
