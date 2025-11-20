import React, { useState } from "react";
import { faFileAlt } from "@fortawesome/free-regular-svg-icons";
import { faContactCard, faPlayCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import CreateATemplete from '../../assets/images/icons/create-a-template.png';
import ImportContact from '../../assets/images/icons/import-contact.png';
import CreateACampaign from '../../assets/images/icons/create-a-campaign.png';
import GenerateEmail from '../../assets/images/icons/generate-email.png';
import ScheduleCampaign from '../../assets/images/icons/schedule-campaign.png';
import { useNavigate } from "react-router-dom";
export const Dashboard: React.FC = () => {
  const [mode, setMode] = useState<"new" | "existing">("new");
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  const handleOpen = () => setShowModal(true);
  const handleClose = () => setShowModal(false);

  return (
    <div className="mx-auto">
      {/* Toggle */}
      <div className="flex justify-start items-center mb-2">
        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setMode("new")}
            className={`px-8 py-2 cursor-pointer font-semibold  ${mode === "new" ? "bg-[#3f9f42] text-white" : "bg-white"
              }`}
          >
            Get started
          </button>
          <button
            onClick={() => setMode("existing")}
            className={`px-8 py-2 cursor-pointer font-semibold  ${mode === "existing" ? "bg-[#3f9f42] text-white" : "bg-white"
              }`}
          >
            Progress
          </button>
        </div>
      </div>

      {/* ================= Get started ================= */}
      {mode === "new" && (
        <div className="">
          <div className="flex justify-between gap-2 items-start py-3 pb-2">
            <div>
              <h1 className="text-[22px] mb-0 font-semibold font-bold">Get started with PitchKraft</h1>
              <div className=" text-gray-500 mt-0.5">
                Send your first campaign in about 15 minutes.
              </div>
            </div>
            <span className="text-gray-600">
              Watch 3-min intro — video coming soon
            </span>
          </div>

          <div className="py-3 pt-0 mt-[15px]">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Step */}
              <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                <div className="flex justify-between items-center gap-2">
                  <div className="flex items-center font-[600] text-[20px]">
                    <span className="min-w-[30px] h-[30px] font-[600] rounded-full bg-[#cfecd6] green flex items-center justify-center text-[16px] font-extrabold mr-2">
                      1
                    </span>
                    Create a template
                  </div>
                  <span className=" text-gray-400">Video coming soon</span>
                </div>
                <div className="flex justify-between h-[calc(100%-30px)]">
                  <div className="flex-1 flex flex-col">
                    <div className="text-gray-500 my-6">
                      <p>Contact your account manager for new pitch templates. Soon you'll
                        be able to build them right in PitchKraft.</p>
                    </div>
                    <button onClick={() => navigate("/main?tab=TestTemplate")} className="border-[#3f9f42] border  w-[fit-content] mt-[auto] text-[#3f9f42]  rounded-md px-3 py-1.5  font-semibold ">
                      Create template
                    </button>
                  </div>
                  <div className="min-w-[180px] d-flex justify-center items-center">
                    <div className="flex items-center justify-center rounded-full">
                      <img src={CreateATemplete} alt="" className="h-[100px]"></img>
                    </div>
                  </div>
                </div>

              </div>

              {/* Example Step 2 */}
              <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                <div className="flex justify-between items-center gap-2">
                  <div className="flex items-center font-[600] text-[20px]">
                    <span className="min-w-[30px] h-[30px] font-[600] rounded-full bg-[#cfecd6] green flex items-center justify-center text-[16px] font-extrabold mr-2">
                      2
                    </span>
                    Import contacts
                  </div>
                  <button onClick={handleOpen} className=" green flex gap-2 items-center">
                    <FontAwesomeIcon
                      icon={faPlayCircle}
                      className=" text-[#3f9f42] text-[14px]"
                    />
                    <span>
                      Watch quick intro
                    </span>
                  </button>
                  {showModal && (
                    <div
                      style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        backgroundColor: "rgba(0,0,0,0.5)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 1000,
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: "#fff",
                          padding: "20px",
                          borderRadius: "10px",
                          maxWidth: "800px",
                          width: "90%",
                        }}
                      >
                        <button
                          onClick={handleClose}
                          style={{ float: "right", fontSize: "16px" }}
                        >
                          Close
                        </button>
                        <video
                          width="100%"
                          height="auto"
                          controls
                          autoPlay
                          src="/video/Import contacts into PitchKraft.mp4"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-between h-[calc(100%-30px)]">
                  <div className="flex-1 flex flex-col">
                    <div className="text-gray-500 my-6">
                      <p className="flex-1">Add your audience (we’ll help map columns).</p>
                    </div>
                    <button onClick={() => navigate("/main?tab=DataCampaigns&subtab=List")} className="border-[#3f9f42] border  w-[fit-content] mt-[auto] text-[#3f9f42]  rounded-md px-3 py-1.5  font-semibold">
                      Import contacts
                    </button>
                  </div>
                  <div className="min-w-[180px] d-flex justify-center items-center">
                    <div className="flex items-center justify-center rounded-full">
                      <img src={ImportContact} alt="" className="h-[100px]"></img>
                    </div>
                  </div>
                </div>

              </div>

              {/* Example Step 3 */}
              <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                <div className="flex justify-between items-center gap-2">
                  <div className="flex items-center font-[600] text-[20px]">
                    <span className="min-w-[30px] h-[30px] font-[600] rounded-full bg-[#cfecd6] green flex items-center justify-center text-[16px] font-extrabold mr-2">
                      3
                    </span>
                    Create a campaign
                  </div>
                  <button onClick={handleOpen} className=" green flex gap-2 items-center">
                    <FontAwesomeIcon
                      icon={faPlayCircle}
                      className=" text-[#3f9f42] text-[14px]"
                    />
                    <span>
                      Watch quick intro
                    </span>
                  </button>
                  {showModal && (
                    <div
                      style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        backgroundColor: "rgba(0,0,0,0.5)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 1000,
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: "#fff",
                          padding: "20px",
                          borderRadius: "10px",
                          maxWidth: "800px",
                          width: "90%",
                        }}
                      >
                        <button
                          onClick={handleClose}
                          style={{ float: "right", fontSize: "16px" }}
                        >
                          Close
                        </button>
                        <video
                          width="100%"
                          height="auto"
                          controls
                          autoPlay
                          src="/video/Create a campaign.mp4"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-between h-[calc(100%-30px)]">
                  <div className="flex-1 flex flex-col">
                    <div className="text-gray-500 my-6">
                      <p className="flex-1">Pick a template + audience, then you’re ready to send.</p>
                    </div>
                    <button onClick={() => navigate("/main?tab=Campaigns")} className="border-[#3f9f42] border  w-[fit-content] mt-[auto] text-[#3f9f42]  rounded-md px-3 py-1.5  font-semibold">
                      New campaign
                    </button>
                  </div>
                  <div className="min-w-[180px] d-flex justify-center items-center">
                    <div className="flex items-center justify-center rounded-full">
                      <img src={CreateACampaign} alt="" className="h-[100px]"></img>
                    </div>

                  </div>
                </div>

              </div>

              {/* Example Step 4 */}
              <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                <div className="flex justify-between items-center gap-2">
                  <div className="flex items-center font-[600] text-[20px]">
                    <span className="min-w-[30px] h-[30px] font-[600] rounded-full bg-[#cfecd6] green flex items-center justify-center text-[16px] font-extrabold mr-2">
                      4
                    </span>
                    Generate emails

                  </div>
                  <span className=" text-gray-400">Video coming soon</span>
                  {/* <button className=" green flex gap-2 items-center">
                    <FontAwesomeIcon
                      icon={faPlayCircle}
                      className=" text-[#3f9f42] text-[14px]"
                    />
                    <span>Video coming sooon</span>
                  </button> */}
                </div>
                <div className="flex justify-between h-[calc(100%-30px)]">
                  <div className="flex-1 flex flex-col">
                    <div className="text-gray-500 my-6">
                      <p className="flex-1">Create hyper-personalized emails for your campaigns.</p>
                    </div>
                    <button onClick={() => navigate("/main?tab=Output")} className="border-[#3f9f42] border  w-[fit-content] mt-[auto] text-[#3f9f42]  rounded-md px-3 py-1.5  font-semibold">
                      Generate emails
                    </button>
                  </div>
                  <div className="min-w-[180px] d-flex justify-center items-center">
                    <div className="flex items-center justify-center rounded-full">
                      <img src={GenerateEmail} alt="" className="h-[100px]"></img>
                    </div>

                  </div>
                </div>

              </div>

              {/* Example Step 5 */}
              <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                <div className="flex justify-between items-center gap-2">
                  <div className="flex items-center font-[600] text-[20px]">
                    <span className="min-w-[30px] h-[30px] font-[600] rounded-full bg-[#cfecd6] green flex items-center justify-center text-[16px] font-extrabold mr-2">
                      5
                    </span>
                    Schedule and review campaigns
                  </div>

                  <span className=" text-gray-400">Video coming soon</span>

                </div>
                <div className="flex justify-between h-[calc(100%-30px)]">
                  <div className="flex-1 flex flex-col">
                    <div className="text-gray-500 my-6">
                      <p className="flex-1">Add email settings, set sending schedules, then check analytics for opens, clicks and replies.</p>
                    </div>
                    <button onClick={() => navigate("/main?tab=Mail&mailSubTab=Schedule")} className="border-[#3f9f42] border  w-[fit-content] mt-[auto] text-[#3f9f42]  rounded-md px-3 py-1.5  font-semibold">
                      Schedule and review campaigns
                    </button>
                  </div>
                  <div className="min-w-[180px] d-flex justify-center items-center">
                    <div className="flex items-center justify-center rounded-full">
                      <img src={ScheduleCampaign} alt="" className="h-[100px]"></img>
                    </div>

                  </div>
                </div>

              </div>

              {/* ...repeat other steps the same way... */}

              {/* Promo box */}
              <div className="border border-dashed border-green-400 rounded-lg bg-green-50 p-4 shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                <div className="flex justify-between items-center gap-2">
                  <div className=" font-semibold font-[600] text-[20px]">Want to explore first?</div>
                  <span className="bg-green-100 border border-green-400 text-green-900 px-4 py-0.5 rounded-full font-bold">
                    Optional
                  </span>
                </div>
                <div className=" text-gray-500 my-2">
                  Load a safe demo workspace you can delete anytime. Demo includes
                  sample templates, dummy contacts, and a sample campaign. Go ahead
                  and play with it.
                </div>
                <button className="bg-[#3f9f42] text-white rounded-md px-3 py-1.5  font-semibold ">
                  Try demo workspace
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= Progress ================= */}
      {mode === "existing" && (
        <div className="grid gap-3 mt-2 md:grid-cols-4">
          {/* Campaigns card */}
          <div className="">
            <div className="p-3 flex justify-between items-center">
              <div className="text-sm font-bold">Campaigns</div>
            </div>
            <div className="py-3 pt-0">
              <div className="flex justify-between items-center border border-gray-200 rounded-md bg-white p-2">
                <div>
                  <div className="font-semibold">Q3 Promo – UK</div>
                  <div className=" text-gray-500">Draft • Updated 2h ago</div>
                </div>
                <div className="flex gap-2">
                  <button className="bg-gray-100 border border-gray-200 text-gray-700 rounded-md px-2 py-1 ">
                    View
                  </button>
                  <button className="bg-white border border-gray-200 text-gray-700 rounded-md px-2 py-1 ">
                    Edit
                  </button>
                </div>
              </div>
              {/* ...more items... */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
