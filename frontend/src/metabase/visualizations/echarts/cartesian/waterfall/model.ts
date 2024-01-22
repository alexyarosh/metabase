import type { RawSeries, RowValue } from "metabase-types/api";
import type {
  ComputedVisualizationSettings,
  RenderingContext,
} from "metabase/visualizations/types";
import { getCartesianChartModel } from "metabase/visualizations/echarts/cartesian/model";
import type {
  CartesianChartModel,
  DataKey,
  ChartDataset,
  XAxisModel,
  Datum,
} from "metabase/visualizations/echarts/cartesian/model/types";
import dayjs from "dayjs";
import {
  applySquareRootScaling,
  getDatasetExtents,
  replaceValues,
} from "metabase/visualizations/echarts/cartesian/model/dataset";
import { getYAxisModel } from "metabase/visualizations/echarts/cartesian/model/axis";
import { isAbsoluteDateTimeUnit } from "metabase-types/guards/date-time";
import { t } from "ttag";
import type {
  WaterfallDataset,
  WaterfallDatum,
} from "metabase/visualizations/echarts/cartesian/waterfall/types";
import {
  WATERFALL_END_2_KEY,
  WATERFALL_END_KEY,
  WATERFALL_START_2_KEY,
  WATERFALL_START_KEY,
  WATERFALL_VALUE_KEY,
} from "metabase/visualizations/echarts/cartesian/waterfall/constants";
import { isNumber } from "metabase/lib/types";
import { X_AXIS_DATA_KEY } from "metabase/visualizations/echarts/cartesian/constants/dataset";

const getTotalTimeSeriesXValue = (
  lastDimensionValue: string | number,
  xAxisModel: XAxisModel,
) => {
  const { timeSeriesInterval } = xAxisModel;
  if (timeSeriesInterval == null) {
    return null;
  }
  const { interval, count } = timeSeriesInterval;

  if (!isAbsoluteDateTimeUnit(interval)) {
    return null;
  }

  if (interval === "quarter") {
    return dayjs(lastDimensionValue).add(3, "month").toISOString();
  }

  return dayjs(lastDimensionValue).add(count, interval).toISOString();
};

const getWaterfallDataset = (
  chartModel: CartesianChartModel,
  settings: ComputedVisualizationSettings,
  xAxisModel: XAxisModel,
  hasTotal: boolean,
): WaterfallDataset => {
  const series = chartModel.seriesModels[0];
  const dataset = chartModel.dataset;
  let transformedDataset: WaterfallDataset = [];

  dataset.forEach((datum, index) => {
    const prevDatum = index === 0 ? null : transformedDataset[index - 1];
    const rawValue = datum[series.dataKey];
    const value = isNumber(rawValue) ? rawValue : 0;

    // Number.MIN_VALUE for log scale
    const start = prevDatum == null ? Number.MIN_VALUE : prevDatum.end;
    const end = prevDatum == null ? value : (prevDatum?.end ?? 0) + value;

    const waterfallDatum: WaterfallDatum = {
      [X_AXIS_DATA_KEY]: datum[X_AXIS_DATA_KEY],
      [WATERFALL_VALUE_KEY]: end - (start ?? 0),
      [WATERFALL_START_KEY]: start,
      [WATERFALL_END_KEY]: end,
      // Candlestick series which we use for Waterfall bars requires having four unique dimensions
      [WATERFALL_START_2_KEY]: start,
      [WATERFALL_END_2_KEY]: end,
    };

    transformedDataset.push(waterfallDatum);
  });

  if (hasTotal && transformedDataset.length > 0) {
    const lastDatum = transformedDataset[transformedDataset.length - 1];
    const lastValue = lastDatum.end;

    let totalXValue;
    if (
      settings["graph.x_axis.scale"] === "timeseries" &&
      (typeof lastValue === "string" || typeof lastValue === "number")
    ) {
      totalXValue = getTotalTimeSeriesXValue(
        lastDatum[X_AXIS_DATA_KEY] as any,
        xAxisModel,
      );
    } else {
      totalXValue = t`Total`;
    }

    transformedDataset.push({
      [X_AXIS_DATA_KEY]: totalXValue,
      total: lastDatum.end,
    });
  }

  if (settings["graph.y_axis.scale"] === "pow") {
    transformedDataset = replaceValues(
      transformedDataset,
      (dataKey: DataKey, value: RowValue) =>
        [
          WATERFALL_START_KEY,
          WATERFALL_END_KEY,
          WATERFALL_START_2_KEY,
          WATERFALL_END_2_KEY,
        ].includes(dataKey)
          ? applySquareRootScaling(value)
          : value,
    );
  }

  return transformedDataset;
};

const addTotalDatum = (
  dataset: ChartDataset,
  waterfallDatasetTotalDatum: Datum,
  seriesDataKey: DataKey,
) => {
  if (dataset.length === 0) {
    return [];
  }

  let totalDatum: Datum = {
    [seriesDataKey]: waterfallDatasetTotalDatum.end,
    [X_AXIS_DATA_KEY]: t`Total`,
  };

  return [...dataset, totalDatum];
};

export function getWaterfallChartModel(
  rawSeries: RawSeries,
  settings: ComputedVisualizationSettings,
  renderingContext: RenderingContext,
) {
  const cartesianChartModel = getCartesianChartModel(
    rawSeries,
    settings,
    renderingContext,
  );

  const seriesModel = {
    ...cartesianChartModel.seriesModels[0],
    dataKey: WATERFALL_END_KEY,
  };

  const waterfallDataset = getWaterfallDataset(
    cartesianChartModel,
    settings,
    cartesianChartModel.xAxisModel,
    true,
  );

  // Extending the original dataset with the total datum is necessary for the tooltip to work
  const originalDatasetWithTotal = addTotalDatum(
    cartesianChartModel.dataset,
    waterfallDataset[waterfallDataset.length - 1],
    cartesianChartModel.seriesModels[0].dataKey,
  );

  const extents = getDatasetExtents([seriesModel.dataKey], waterfallDataset);

  const leftYAxisModel = getYAxisModel(
    [seriesModel.dataKey],
    waterfallDataset,
    settings,
    cartesianChartModel.columnByDataKey,
    renderingContext,
  );

  // const xAxisModel = {
  //   ...cartesianChartModel.xAxisModel.formatter,
  //   formatter: (value: RowValue) => {
  //     if (value === t`Total`) {
  //       return value;
  //     }
  //
  //     if (
  //       settings["graph.x_axis.scale"] === "timeseries" &&
  //       dayjs(value).isSame(
  //         dayjs(
  //           waterfallDataset[waterfallDataset.length - 1][
  //             cartesianChartModel.dimensionModel.dataKey
  //           ],
  //         ),
  //       )
  //     ) {
  //       return t`Total`;
  //     }
  //
  //     return cartesianChartModel.xAxisModel.formatter(value);
  //   },
  // };
  return {
    ...cartesianChartModel,
    seriesModels: [seriesModel],
    transformedDataset: waterfallDataset,
    dataset: originalDatasetWithTotal,
    leftYAxisModel,
    // xAxisModel,
    extents,
  };
}
