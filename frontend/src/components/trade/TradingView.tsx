"use client";

import { useEffect, useRef } from 'react';
import { Paper } from '@mui/material';

let tvScriptLoadingPromise: Promise<void>;

function TradingView() {
  const onLoadScriptRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onLoadScriptRef.current = createWidget;

    if (!tvScriptLoadingPromise) {
      tvScriptLoadingPromise = new Promise((resolve) => {
        const script = document.createElement('script');
        script.id = 'tradingview-widget-loading-script';
        script.src = 'https://s3.tradingview.com/tv.js';
        script.type = 'text/javascript';
        script.onload = resolve as () => void;
        document.head.appendChild(script);
      });
    }

    tvScriptLoadingPromise.then(() => onLoadScriptRef.current?.());

    return () => {
      onLoadScriptRef.current = null;
    };
  }, []);

  function createWidget() {
    if (document.getElementById('tradingview_chart') && 'TradingView' in window) {
      new (window as any).TradingView.widget({
        autosize: true,
        symbol: "BINANCE:BTCUSDT",
        interval: "D",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        enable_publishing: false,
        allow_symbol_change: true,
        container_id: "tradingview_chart",
        hide_side_toolbar: false,
      });
    }
  }

  return (
    <Paper 
      elevation={0}
      sx={{ 
        height: '100%',  // Fill container height
        '& > div': {
          height: '100% !important',  // Force TradingView to fill height
        }
      }}
    >
      <div id='tradingview_chart' style={{ height: '100%', width: '100%' }} />
    </Paper>
  );
}

export default TradingView;
