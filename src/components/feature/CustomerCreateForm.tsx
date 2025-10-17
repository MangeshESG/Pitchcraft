import React, { useEffect, useState } from "react";
import { RootState } from "../../Redux/store";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Plan } from "./planes";
import API_BASE_URL from "../../config";
import { useLocation } from "react-router-dom";
interface CustomerCreateFormProps {
  plan: Plan | null;
  clientId: string;
}
// const CustomerCreateForm: React.FC<CustomerCreateFormProps> = ({ plan, clientId }) => {
const CustomerCreateForm: React.FC = () => {
  const location = useLocation();
  const { plan, clientId } = location.state || {};
  const username = useSelector((state: RootState) => state.auth.username);
  console.log("username:", username);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    displayName: username || "",
    firstName: "",
    lastName: "",
    email: "",
    //companyName: "",
    // phone: "",
    billingAddress: {
      //attention: "",
      street: "",
      city: "",
      state: "",
      zip: "",
      country: "",
      //fax: "",
    },
    currencyCode: "",
    // isPortalEnabled: false,
    // paymentTerms: 0,
    // paymentTermsLabel: "",
  });



  // ✅ Handle nested and normal fields
  const reduxUserId = useSelector((state: RootState) => state.auth.userId);

  const selectedClient = ""; // placeholder — replace with real value
  const effectiveUserId = selectedClient !== "" ? selectedClient : reduxUserId;
  // const effectiveUserId = "1";
  const [countries, setCountries] = useState<{ id: number; name: string; currency: string }[]>([]);; // ✅ Added
  const [loadingCountries, setLoadingCountries] = useState(false); // ✅ Added
  const [errorCountries, setErrorCountries] = useState<string | null>(null);

  // ✅ Fetch countries from API
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setLoadingCountries(true);
        const res = await fetch("https://localhost:7216/api/Plane/get-Countries");
        if (!res.ok) throw new Error("Failed to fetch countries");
        const data = await res.json();

        // Assuming your API returns something like: ["India", "USA", "Canada"]
        setCountries(data);
      } catch (error: any) {
        console.error("Error fetching countries:", error);
        setErrorCountries(error.message || "Error loading countries");
      } finally {
        setLoadingCountries(false);
      }
    };

    fetchCountries();
  }, []);

  const [showForm, setShowForm] = useState(false);
  useEffect(() => {
    console.log("User ID from Redux:", reduxUserId);
    console.log("Effective User ID:", effectiveUserId);
  }, [reduxUserId, effectiveUserId]);

  // ✅ Fetch customer details (to auto-fill email)
  useEffect(() => {
    const fetchCustomerDetails = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/Plane/get-CustomersInClient?clientId=${effectiveUserId}`
        );
        if (!res.ok) throw new Error("Failed to fetch customer details");

        const customer = await res.json();
        console.log("InClientCustomer API response:", customer);

        // ✅ Directly assign because it's a single object
        setFormData((prev) => ({
          ...prev,
          firstName: customer.firstName || "",
          lastName: customer.lastName || "",
          email: customer.email || "",
        }));

        console.log("Updated formData:", {
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
        });
      } catch (error) {
        console.error("Error fetching customer details:", error);
      }
    };

    if (effectiveUserId) fetchCustomerDetails();
  }, [effectiveUserId]);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // if (name.startsWith("billingAddress.")) {
    //   const [parent, child] = name.split(".");
    //   setFormData((prev) => ({
    //     ...prev,
    //     [parent]: {
    //       ...prev[parent as "billingAddress"],
    //       [child]: value,
    //     },
    //   }));
    // } else {
    //   setFormData((prev) => ({ ...prev, [name]: value }));
    // }
    if (name === "billingAddress.country") {
      // find selected country object
      const selectedCountry = countries.find((c) => c.name === value);

      setFormData((prev) => ({
        ...prev,
        billingAddress: {
          ...prev.billingAddress,
          country: value,
        },
        // auto-fill currencyCode when country changes
        currencyCode: selectedCountry ? selectedCountry.currency : "",
      }));
    } else if (name.startsWith("billingAddress.")) {
      const [parent, child] = name.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent as "billingAddress"],
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };
  const [message, setMessage] = useState<{ type: "success" | "error" | ""; text: string }>({
    type: "",
    text: "",
  });
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting:", formData);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/Plane/create-customer?ClinteId=${effectiveUserId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Customer creation failed");

      const data = await res.json();
      console.log("Success:", data);

        const customerId = data.customer_id || data.customerId || data.id;
    if (!customerId) throw new Error("Customer ID not found in response");
      // Now that the customer is created, subscribe them to the selected plan
      if (plan) {
        const subRes = await fetch(
          `${API_BASE_URL}/api/Plane/new-subscription?clientId=${effectiveUserId}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customer_id: data.customer_id,
              customer: { display_name: formData.displayName, email: formData.email },
              plan: { plan_code: plan.planCode, quantity: 1 },
              payment_gateways: [{ payment_gateway: "stripe" }],
            }),
          }
        );
        if (!subRes.ok) throw new Error("Subscription API failed");
        const subData = await subRes.json();
         console.log("✅ Subscription created:", subData);
        if (subData?.url) {
          setMessage({ type: "success", text: "Account created, redirecting to payment..." });
          // setTimeout(() => window.location.href = subData.url, 1500);
          setPaymentUrl(subData.url);
        } else {
          setMessage({ type: "success", text: "Account and subscription created!" });
        }
      }
    } catch (error) {
      console.error("Error creating account:", error);
      setMessage({
        type: "error",
        text: "Error creating account. Please try again.",
      });
    }
  };

  return (
    // <div className="max-w-xl mx-auto mt-10 bg-white p-6 rounded-lg shadow-md">
    //   <h2 className="text-2xl font-bold mb-4 text-center">Create account</h2>
    //   <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">

    //     {/* Basic Info */}
    //     <input type="text" name="displayName" placeholder="Display name" onChange={handleChange} className="border p-2 rounded col-span-2" />
    //     <input type="text" name="firstName" placeholder="First name" onChange={handleChange} className="border p-2 rounded" />
    //     <input type="text" name="lastName" placeholder="Last name" onChange={handleChange} className="border p-2 rounded" />
    //     <input type="email" name="email" placeholder="Email" onChange={handleChange} className="border p-2 rounded col-span-2" />
    //     <input type="text" name="mobile" placeholder="Mobile" onChange={handleChange} className="border p-2 rounded" />

    //     {/* Billing Address */}
    //     <h3 className="col-span-2 font-semibold mt-4">Billing address</h3>
    //     <input type="text" name="billingAddress.street" placeholder="Street" onChange={handleChange} className="border p-2 rounded col-span-2" />
    //     <input type="text" name="billingAddress.city" placeholder="City" onChange={handleChange} className="border p-2 rounded" />
    //     <input type="text" name="billingAddress.state" placeholder="State" onChange={handleChange} className="border p-2 rounded" />
    //     <input type="text" name="billingAddress.zip" placeholder="Zip" onChange={handleChange} className="border p-2 rounded" />
    //     <input type="text" name="billingAddress.country" placeholder="Country" onChange={handleChange} className="border p-2 rounded" />
    //     <input type="text" name="billingAddress.stateCode" placeholder="Statecode" onChange={handleChange} className="border p-2 rounded" />

    //     {/* Other fields */}
    //     <input type="text" name="currencyCode" placeholder="Currency code" onChange={handleChange} className="border p-2 rounded col-span-2" />

    //     {/* Submit */}
    //     <button type="submit" className="col-span-2 bg-green-600 text-white py-2 rounded hover:bg-green-700">
    //       Create
    //     </button>
    //   </form>
    // </div>

    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-6">
       {paymentUrl ? (
          <div  className="bg-white shadow-2xl rounded-2xl w-full max-w-3xl p-8 transition-all hover:shadow-green-200">
            <h3 className="text-xl font-bold text-center text-[#3f9f42] mb-4">Complete Payment</h3>
            <iframe
              src={paymentUrl}
              title="Payment"
              width="100%"
              height="600"
              frameBorder="0"
              className="rounded-lg shadow-lg border"
            />
          </div>
        ): (
      <div className="bg-white shadow-2xl rounded-2xl w-full max-w-2xl p-8 transition-all hover:shadow-green-200">

        <h2 className="text-3xl font-bold text-center text-[#3f9f42] mb-2 mt-[-12px]">
          Billing  information
        </h2>
        {message.text && (
          <div
            className={`text-center mb-4 p-3 rounded-xl font-semibold ${message.type === "success"
              ? "bg-green-100 text-green-700 border border-green-300"
              : "bg-red-100 text-red-700 border border-red-300"
              }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Display name */}
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">
              Display name
            </label>
            <input
              type="text"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              placeholder="Enter display name"
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3f9f42] focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700">
                First name
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder=""
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3f9f42] focus:border-transparent outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700">
                Last name
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Enter last name"
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3f9f42] focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@gamil.com"
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3f9f42] focus:border-transparent outline-none transition-all"
            />
          </div>
          {/* Billing Address */}
          <div className="mt-6">
            <h3 className="text-lg font-bold text-[#3f9f42] mb-3">
              Billing address
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Street"
                name="billingAddress.street"
                value={formData.billingAddress.street}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3f9f42] focus:border-transparent outline-none transition-all"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="City"
                  name="billingAddress.city"
                  value={formData.billingAddress.city}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3f9f42] focus:border-transparent outline-none transition-all"
                />
                <input
                  type="text"
                  placeholder="State"
                  name="billingAddress.state"
                  value={formData.billingAddress.state}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3f9f42] focus:border-transparent outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Zip"
                  name="billingAddress.zip"
                  value={formData.billingAddress.zip}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3f9f42] focus:border-transparent outline-none transition-all"
                />
                <select
                  name="billingAddress.country"
                  value={formData.billingAddress.country}
                  onChange={handleChange}
                  className="border rounded-lg p-2 w-full"
                >
                  <option value="">Select country</option>
                  {countries.map((country) => (
                    <option key={country.id} value={country.name}>
                      {country.name} ({country.currency})
                    </option>
                  ))}
                </select>
              </div>
              <select
                name="currencyCode"
                value={formData.currencyCode}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3f9f42] focus:border-transparent outline-none transition-all"
              >
                <option value="">Select currency</option>
                {Array.from(new Set(countries.map((c) => c.currency))).map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full mt-8 bg-[#3f9f42] text-white font-semibold py-3 rounded-xl hover:bg-green-700 transition-all shadow-lg hover:shadow-green-300"
          >
            Save details
          </button>
        </form>
      </div>
       )}
    </div>

  );
};

export default CustomerCreateForm;
