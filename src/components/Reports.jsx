import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatPrice, calculateTopItems, calculateHourlyDistribution } from '../utils/helpers';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  Clock,
  Calendar,
  Download,
  Filter
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Reports() {
  const { state, actions } = useApp();
  const { orderHistory } = state;
  
  const [dateRange, setDateRange] = useState('today'); // 'today' | 'week' | 'month'
  const [showDetails, setShowDetails] = useState(false);
  
  // Filter orders based on date range
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return orderHistory.filter(order => {
      if (order.status !== 'paid') return false;
      const orderDate = new Date(order.paidAt);
      
      if (dateRange === 'today') {
        return orderDate >= today;
      } else if (dateRange === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return orderDate >= weekAgo;
      } else if (dateRange === 'month') {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return orderDate >= monthAgo;
      }
      return true;
    });
  }, [orderHistory, dateRange]);
  
  // Calculate statistics
  const stats = useMemo(() => {
    const totalSales = filteredOrders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = filteredOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    const totalItems = filteredOrders.reduce((sum, order) => 
      sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    );
    const totalTax = filteredOrders.reduce((sum, order) => sum + order.tax, 0);
    
    // Sales by payment method
    const salesByPayment = filteredOrders.reduce((acc, order) => {
      acc[order.paymentMethod] = (acc[order.paymentMethod] || 0) + order.total;
      return acc;
    }, {});
    
    return {
      totalSales,
      totalOrders,
      avgOrderValue,
      totalItems,
      totalTax,
      salesByPayment,
    };
  }, [filteredOrders]);
  
  const topItems = useMemo(() => {
    return calculateTopItems(filteredOrders, 5);
  }, [filteredOrders]);
  
  const hourlyData = useMemo(() => {
    return calculateHourlyDistribution(filteredOrders);
  }, [filteredOrders]);
  
  const maxHourlySales = Math.max(...hourlyData.map(h => h.sales), 1);
  
  return (
    <div className="flex-1 flex flex-col h-full bg-cream">
      {/* Header */}
      <div className="p-4 bg-white border-b border-latte/20">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => actions.setView('pos')}
              className="flex items-center gap-2 text-medium-roast hover:text-dark-roast transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to POS
            </button>
            <h1 className="font-display text-xl font-semibold text-dark-roast">
              Sales Reports
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Date range selector */}
            <div className="flex bg-latte/10 rounded-xl p-1">
              {[
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => setDateRange(option.id)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors btn-press ${
                    dateRange === option.id
                      ? 'bg-espresso text-white'
                      : 'text-medium-roast hover:bg-latte/20'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            
            <button className="flex items-center gap-2 px-4 py-2 bg-latte/10 text-espresso rounded-xl font-medium hover:bg-latte/20 transition-colors btn-press">
              <Download className="w-5 h-5" />
              Export
            </button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<DollarSign className="w-6 h-6" />}
              label="Total Sales"
              value={formatPrice(stats.totalSales)}
              color="text-success"
              bgColor="bg-success/10"
            />
            <StatCard
              icon={<ShoppingBag className="w-6 h-6" />}
              label="Total Orders"
              value={stats.totalOrders.toString()}
              color="text-espresso"
              bgColor="bg-espresso/10"
            />
            <StatCard
              icon={<TrendingUp className="w-6 h-6" />}
              label="Avg Order Value"
              value={formatPrice(Math.round(stats.avgOrderValue))}
              color="text-accent"
              bgColor="bg-accent/10"
            />
            <StatCard
              icon={<Users className="w-6 h-6" />}
              label="Items Sold"
              value={stats.totalItems.toString()}
              color="text-medium-roast"
              bgColor="bg-medium-roast/10"
            />
          </div>
          
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Hourly Sales Chart */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-dark-roast mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-medium-roast" />
                Sales by Hour
              </h3>
              <div className="h-48 flex items-end gap-1">
                {hourlyData.map((hour, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex flex-col items-center">
                      <span className="text-xs text-medium-roast mb-1">
                        {formatPrice(hour.sales).replace('RM ', '')}
                      </span>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(hour.sales / maxHourlySales) * 100}%` }}
                        transition={{ delay: index * 0.05 }}
                        className="w-full bg-gradient-to-t from-accent to-accent/60 rounded-t-md min-h-[4px]"
                      />
                    </div>
                    <span className="text-xs text-medium-roast">{hour.hour}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Top Selling Items */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-dark-roast mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-medium-roast" />
                Top Selling Items
              </h3>
              <div className="space-y-3">
                {topItems.length === 0 ? (
                  <p className="text-medium-roast text-sm text-center py-8">
                    No sales data available
                  </p>
                ) : (
                  topItems.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-accent text-white' :
                        index === 1 ? 'bg-latte text-white' :
                        index === 2 ? 'bg-espresso text-white' :
                        'bg-latte/30 text-medium-roast'
                      }`}>
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-dark-roast">{item.name}</p>
                        <p className="text-xs text-medium-roast">{item.quantity} sold</p>
                      </div>
                      <span className="font-mono font-semibold text-espresso">
                        {formatPrice(item.revenue)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          
          {/* Payment Methods */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-dark-roast mb-4">Sales by Payment Method</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { method: 'cash', label: 'Cash', icon: '💵' },
                { method: 'card', label: 'Card', icon: '💳' },
                { method: 'ewallet', label: 'E-Wallet', icon: '📱' },
              ].map(({ method, label, icon }) => (
                <div key={method} className="bg-cream rounded-xl p-4 text-center">
                  <span className="text-3xl mb-2 block">{icon}</span>
                  <p className="font-medium text-dark-roast">{label}</p>
                  <p className="font-mono text-xl font-bold text-accent mt-1">
                    {formatPrice(stats.salesByPayment[method] || 0)}
                  </p>
                  <p className="text-xs text-medium-roast mt-1">
                    {filteredOrders.filter(o => o.paymentMethod === method).length} transactions
                  </p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Recent Transactions */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-dark-roast">Recent Transactions</h3>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-accent hover:underline"
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </button>
            </div>
            
            {filteredOrders.length === 0 ? (
              <p className="text-medium-roast text-sm text-center py-8">
                No transactions yet
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-latte/20 text-left">
                      <th className="py-3 px-2 text-sm font-medium text-medium-roast">Order ID</th>
                      <th className="py-3 px-2 text-sm font-medium text-medium-roast">Table</th>
                      <th className="py-3 px-2 text-sm font-medium text-medium-roast">Items</th>
                      <th className="py-3 px-2 text-sm font-medium text-medium-roast">Payment</th>
                      <th className="py-3 px-2 text-sm font-medium text-medium-roast">Time</th>
                      <th className="py-3 px-2 text-sm font-medium text-medium-roast text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.slice(0, 10).map(order => (
                      <tr key={order.id} className="border-b border-latte/10 hover:bg-cream/50">
                        <td className="py-3 px-2 text-sm font-mono text-medium-roast">
                          {order.id.slice(-8)}
                        </td>
                        <td className="py-3 px-2 text-sm text-dark-roast">
                          {order.tableId === 'COUNTER' ? 'Counter' : `Table ${order.tableId?.replace('T', '')}`}
                        </td>
                        <td className="py-3 px-2 text-sm text-medium-roast">
                          {order.items.length} items
                        </td>
                        <td className="py-3 px-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            order.paymentMethod === 'cash' ? 'bg-success/10 text-success' :
                            order.paymentMethod === 'card' ? 'bg-espresso/10 text-espresso' :
                            'bg-medium-roast/10 text-medium-roast'
                          }`}>
                            {order.paymentMethod === 'cash' && '💵'}
                            {order.paymentMethod === 'card' && '💳'}
                            {order.paymentMethod === 'ewallet' && '📱'}
                            {order.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-sm text-medium-roast">
                          {new Date(order.paidAt).toLocaleTimeString('en-MY', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-2 text-sm font-mono font-semibold text-dark-roast text-right">
                          {formatPrice(order.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, bgColor }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-5 shadow-sm"
    >
      <div className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center ${color} mb-3`}>
        {icon}
      </div>
      <p className="text-sm text-medium-roast mb-1">{label}</p>
      <p className={`text-2xl font-mono font-bold ${color}`}>
        {value}
      </p>
    </motion.div>
  );
}
