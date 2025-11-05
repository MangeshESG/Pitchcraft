import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../Redux/store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faAngleRight,
  faBars,
  faBullhorn,
  faEdit,
  faEnvelopeOpen,
  faGear,
  faList,
} from '@fortawesome/free-solid-svg-icons';
import { faEnvelope, faFileAlt } from '@fortawesome/free-regular-svg-icons';
import { useNavigate } from 'react-router-dom';
import pitchLogo from '../../assets/images/pitch_logo.png';
import Header from '../common/Header';
import AppModal from '../common/AppModal';
import API_BASE_URL from '../../config';
import './ContactList.css';

interface Subscription {
  subscriptionId: string;
  status: string;
  planName: string;
  planAmount: number;
  interval: string;
  startDate: string;
  endDate: string;
  customerEmail: string;
}

interface SubscriptionResponse {
  items: Subscription[];
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

const PlanHistory: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const pageSize = 10;

  const reduxUserId = useSelector((state: RootState) => state.auth.userId);
  const customerId = reduxUserId || "1";

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatAmount = (amount: number) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '$0.00';
    return `$${amount.toFixed(2)}`;
  };

  const getStatusBadge = (status: string) => {
    if (!status) return <span className="status-badge inactive">Unknown</span>;
    const statusClass = status.toLowerCase() === 'active' ? 'active' : 'inactive';
    return (
      <span className={`status-badge ${statusClass}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const fetchSubscriptions = async (page: number = 1) => {
    setIsLoading(true);
    try {
      const url = `${API_BASE_URL}/api/stripe/get-user-plan_history?clientId=${customerId}&pageNumber=${page}&pageSize=${pageSize}`;
      console.log('Fetching from URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'accept': '*/*'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: SubscriptionResponse = await response.json();
      console.log('API Response:', data);
      
      setSubscriptions(Array.isArray(data.items) ? data.items : []);
      setTotalPages(typeof data.totalPages === 'number' ? data.totalPages : 1);
      setTotalRecords(typeof data.totalRecords === 'number' ? data.totalRecords : 0);
      setCurrentPage(typeof data.currentPage === 'number' ? data.currentPage : 1);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      setSubscriptions([]);
      setTotalPages(1);
      setTotalRecords(0);
      setCurrentPage(1);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      const nextPage = currentPage + 1;
      fetchSubscriptions(nextPage);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      const prevPage = currentPage - 1;
      fetchSubscriptions(prevPage);
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      fetchSubscriptions(page);
    }
  };

  return (
    <div className="flex h-full bg-gray-100">
      {/* Sidebar */}
      {isSidebarOpen && (
        <aside className="bg-white border-r shadow-sm flex flex-col transition-all duration-300 h-full">
          <div className="p-2 text-xl font-bold border-b">
            <div className="flex justify-between items-start">
              <img
                src={pitchLogo}
                alt="Pitchcraft Logo"
                style={{ height: "100px" }}
              />
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="w-[40px] h-[40px] flex items-center justify-center rounded-md bg-gray-200 hover:bg-gray-300 mt-[10px]"
              >
                <FontAwesomeIcon
                  icon={faBars}
                  className="text-[#333333] text-2xl"
                />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto h-full">
            <nav className="flex-1 py-4 space-y-2">
              <div className="side-menu">
                <div className="side-menu-inner">
                  <ul className="side-menu-list">
                    <li>
                      <button
                        onClick={() => navigate('/main')}
                        className="side-menu-button"
                      >
                        <span className="menu-icon">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 24 24" fill="#111111">
                            <path stroke="#111111" strokeWidth="2" d="M4 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5ZM14 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V5ZM4 16a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3ZM14 13a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-6Z" />
                          </svg>
                        </span>
                        <span className="menu-text">Dashboard</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => navigate('/main?tab=Template')}
                        className="side-menu-button"
                      >
                        <span className="menu-icon">
                          <FontAwesomeIcon icon={faFileAlt} className="text-[#333333] text-lg" />
                        </span>
                        <span className="menu-text">Templates</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => navigate('/main?tab=DataCampaigns')}
                        className="side-menu-button"
                      >
                        <span className="menu-icon">
                          <FontAwesomeIcon icon={faList} className="text-[#333333] text-lg" />
                        </span>
                        <span className="menu-text">Contacts</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => navigate('/main?tab=Campaigns')}
                        className="side-menu-button"
                      >
                        <span className="menu-icon">
                          <FontAwesomeIcon icon={faBullhorn} className="text-[#333333] text-lg" />
                        </span>
                        <span className="menu-text">Campaigns</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => navigate('/main?tab=Output')}
                        className="side-menu-button"
                      >
                        <span className="menu-icon">
                          <FontAwesomeIcon icon={faEnvelopeOpen} className="text-[#333333] text-lg" />
                        </span>
                        <span className="menu-text">Kraft emails</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => navigate('/main?tab=Mail')}
                        className="side-menu-button"
                      >
                        <span className="menu-icon">
                          <FontAwesomeIcon icon={faEnvelope} className="text-[#333333] text-lg" />
                        </span>
                        <span className="menu-text">Mail</span>
                      </button>
                    </li>
                    <li className="active">
                      <button className="side-menu-button">
                        <span className="menu-icon">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 24 24" fill="#3f9f42">
                            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                          </svg>
                        </span>
                        <span className="menu-text">Plan history</span>
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </nav>
          </div>
        </aside>
      )}

      {/* Content Area */}
      <div className="flex flex-col flex-1 h-full">
        {/* Header */}
        <header className="bg-white shadow-sm border-b p-2 px-4 flex justify-between items-center min-h-[77px]">
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-[40px] h-[40px] flex items-center justify-center rounded-md bg-gray-200 hover:bg-gray-300 mr-[15px]"
            >
              <FontAwesomeIcon
                icon={faBars}
                className="text-[#333333] text-2xl"
              />
            </button>
          )}
          <Header
            connectTo={true}
            selectedClient={""}
            handleClientChange={() => {}}
            clientNames={[]}
            userRole={"USER"}
          />
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto h-[calc(100%-87px)]">
          <div className="bg-white p-4 shadow-md rounded-md p-6">
            <div className="data-campaigns-container">
              <div className="section-wrapper">
                <h2 className="section-title">Plan history</h2>

                {!isLoading && (
                  <>
                    <table className="contacts-table" style={{ background: '#fff' }}>
                      <thead>
                        <tr>
                          <th>Subscription ID</th>
                          <th>Plan Name</th>
                          <th>Amount</th>
                          <th>Interval</th>
                          <th>Status</th>
                          <th>Start Date</th>
                          <th>End Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!Array.isArray(subscriptions) || subscriptions.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center">
                              No subscription history found.
                            </td>
                          </tr>
                        ) : (
                          subscriptions.map((subscription, index) => {
                            if (!subscription) return null;
                            return (
                              <tr key={subscription.subscriptionId || `subscription-${index}`}>
                                <td style={{ fontFamily: 'monospace' }}>
                                  {subscription.subscriptionId || 'N/A'}
                                </td>
                                <td>{subscription.planName || 'Unknown'}</td>
                                <td>{formatAmount(subscription.planAmount)}</td>
                                <td>
                                  {subscription.interval ? subscription.interval.charAt(0).toUpperCase() + subscription.interval.slice(1).toLowerCase() : ''}
                                </td>
                                <td>{getStatusBadge(subscription.status)}</td>
                                <td>{formatDate(subscription.startDate)}</td>
                                <td>{formatDate(subscription.endDate)}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>

                    {subscriptions.length > 0 && (
                      <div className="d-flex justify-between align-center" style={{ marginTop: '16px' }}>
                        <div className="pagination-info">
                          Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} items
                        </div>
                        <div className="pagination-controls d-flex align-center" style={{ gap: '8px' }}>
                          <button
                            className="pagination-btn"
                            disabled={currentPage === 1}
                            onClick={() => handlePageChange(1)}
                            title="First page"
                          >
                            ≪
                          </button>
                          <button
                            className="pagination-btn"
                            disabled={currentPage === 1}
                            onClick={handlePrevPage}
                            title="Previous page"
                          >
                            ‹ Prev
                          </button>
                          <button
                            className="pagination-btn"
                            disabled={currentPage >= totalPages}
                            onClick={handleNextPage}
                            title="Next page"
                          >
                            Next ›
                          </button>
                          <button
                            className="pagination-btn"
                            disabled={currentPage >= totalPages}
                            onClick={() => handlePageChange(totalPages)}
                            title="Last page"
                          >
                            ≫
                          </button>
                          <span style={{ marginLeft: '16px', fontSize: '14px', color: '#666' }}>Page</span>
                          <input
                            type="number"
                            value={currentPage}
                            onChange={(e) => {
                              const page = parseInt(e.target.value);
                              if (page >= 1 && page <= totalPages) {
                                handlePageChange(page);
                              }
                            }}
                            style={{
                              width: '50px',
                              padding: '4px 8px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              textAlign: 'center',
                              fontSize: '14px'
                            }}
                          />
                          <span style={{ fontSize: '14px', color: '#666' }}>of {totalPages}</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
      <AppModal
        isOpen={isLoading}
        onClose={() => {}}
        type="loader"
        loaderMessage="Loading subscriptions..."
        closeOnOverlayClick={false}
      />
    </div>
  );
};

export default PlanHistory;