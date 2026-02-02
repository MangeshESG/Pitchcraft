import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../../../config";
import { RootState } from "../../../Redux/store";
import { useSelector } from "react-redux";

const ContactDetailView: React.FC = () => {
  const { contactId } = useParams<{ contactId: string }>();
  const reduxUserId = useSelector((state: RootState) => state.auth.userId);

  const [contact, setContact] = useState<any>(null);
  const [activeTab, setActiveTab] =
    useState<"profile" | "history">("profile");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contactId || !reduxUserId) return;

    const fetchContact = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/Crm/contacts/List-by-CleinteId?clientId=${reduxUserId}`
        );

        // API returns { contacts: [], contactCount: number }
        const contacts = res.data?.contacts || [];

        const found = contacts.find(
          (c: any) => String(c.id) === String(contactId)
        );

        setContact(found || null);
      } catch (err) {
        console.error("Failed to load contact", err);
      } finally {
        setLoading(false);
      }
    };

    fetchContact();
  }, [contactId, reduxUserId]);

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (!contact) return <div style={{ padding: 20 }}>Contact not found</div>;

  return (
    <div style={{ padding: 20 }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <button
          className={activeTab === "profile" ? "tab active" : "tab"}
          onClick={() => setActiveTab("profile")}
        >
          Profile
        </button>

        <button
          className={activeTab === "history" ? "tab active" : "tab"}
          onClick={() => setActiveTab("history")}
        >
          History
        </button>
      </div>

      {/* Profile */}
      {activeTab === "profile" && (
        <div>
          <h3>Profile</h3>
          <p><strong>Full Name:</strong> {contact.full_name || "-"}</p>
          <p><strong>Email:</strong> {contact.email || "-"}</p>
          <p><strong>Company:</strong> {contact.company_name || "-"}</p>
          <p><strong>Job Title:</strong> {contact.job_title || "-"}</p>
          <p><strong>Location:</strong> {contact.country_or_address || "-"}</p>
        </div>
      )}

      {/* History */}
      {activeTab === "history" && (
        <div>
          <h3>History</h3>
          <p>Email history will appear here.</p>
        </div>
      )}
    </div>
  );
};

export default ContactDetailView;
