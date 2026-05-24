import { useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

export default function AnalyzerChart({ data }) {
  const [chartType, setChartType] = useState("combi"); // 'combi' | 'bar' | 'line'

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500">
        Add subscriptions to see analytics.
      </div>
    );
  }

  // Format data for Recharts
  const chartData = data.map(sub => ({
    name: sub.platform,
    cost: sub.cost,
    hours: sub.totalHours
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800/90 border border-slate-700/80 p-4 rounded-xl shadow-xl backdrop-blur-sm animate-scale-up">
          <p className="font-bold text-slate-100 mb-2">{label}</p>
          {payload.map((item, idx) => (
            <p 
              key={idx} 
              className="text-sm font-semibold"
              style={{ color: item.color || item.stroke }}
            >
              {item.name}: {item.name.includes("Cost") ? `$${item.value.toFixed(2)}` : `${item.value.toFixed(2)} hrs`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 w-full">
      {/* Chart Representation Switcher */}
      <div className="flex justify-end">
        <div className="flex bg-slate-900 border border-slate-850 p-1 rounded-xl shadow-inner gap-1">
          {[
            { id: "combi", label: "Combi Chart 🔀" },
            { id: "bar", label: "Bar Chart 📊" },
            { id: "line", label: "Line Graph 📈" }
          ].map(type => (
            <button
              key={type.id}
              onClick={() => setChartType(type.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-350 ${
                chartType === type.id 
                  ? "bg-slate-800 text-blue-400 border border-slate-700/50 shadow-sm" 
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/20"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke="#64748b" 
              tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
              axisLine={{ stroke: '#334155' }}
            />
            <YAxis 
              yAxisId="left" 
              orientation="left" 
              stroke="#10b981" 
              tick={{ fill: '#10b981', fontSize: 11 }}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(val) => `$${val}`}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              stroke="#3b82f6" 
              tick={{ fill: '#3b82f6', fontSize: 11 }}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(val) => `${val}h`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }}/>

            {/* Dynamic Rendering depending on selected representation type */}
            {chartType === "combi" && (
              <>
                <Bar yAxisId="left" dataKey="cost" name="Monthly Cost ($)" fill="#10b981" radius={[4, 4, 0, 0]} opacity={0.8} barSize={40} />
                <Line yAxisId="right" type="monotone" dataKey="hours" name="Time Used (Hours)" stroke="#3b82f6" strokeWidth={3.5} dot={{ stroke: '#3b82f6', strokeWidth: 2, r: 4 }} activeDot={{ r: 7 }} />
              </>
            )}

            {chartType === "bar" && (
              <>
                <Bar yAxisId="left" dataKey="cost" name="Monthly Cost ($)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={25} />
                <Bar yAxisId="right" dataKey="hours" name="Time Used (Hours)" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={25} />
              </>
            )}

            {chartType === "line" && (
              <>
                <Line yAxisId="left" type="monotone" dataKey="cost" name="Monthly Cost ($)" stroke="#10b981" strokeWidth={3.5} dot={{ stroke: '#10b981', strokeWidth: 2, r: 4 }} activeDot={{ r: 7 }} />
                <Line yAxisId="right" type="monotone" dataKey="hours" name="Time Used (Hours)" stroke="#3b82f6" strokeWidth={3.5} dot={{ stroke: '#3b82f6', strokeWidth: 2, r: 4 }} activeDot={{ r: 7 }} />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
