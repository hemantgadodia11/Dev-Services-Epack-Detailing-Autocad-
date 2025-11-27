// components/StaticPlot.js
import React from 'react';
import Plot from 'react-plotly.js';

const StaticPlot = ({ coordinates }) => {
  // Prepare data for Plotly
  const data = [
    {
      x: coordinates.map(coord => coord.x),
      y: coordinates.map(coord => coord.y),
      type: 'scatter',  // This type is for scatter plot, you can change it depending on your needs
      mode: 'lines+markers', // Show both lines and markers
      marker: {color: 'red'},
    }
  ];

  // Layout configuration
  const layout = {
    title: 'Coordinate Plot',
    xaxis: {
      title: 'X Axis',
    },
    yaxis: {
      title: 'Y Axis',
    }
  };

  return (
    <Plot
      data={data}
      layout={layout}
      style={{ width: "100%", height: "100%" }}
    />
  );
};

export default StaticPlot;
