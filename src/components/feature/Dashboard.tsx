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
import API_BASE_URL from "../../config";

export const Dashboard: React.FC = () => {
  const [mode, setMode] = useState<"new" | "existing">("new");
  const navigate = useNavigate();
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showKraftEmailModal, setShowKraftEmailModal] = useState(false);
  const [showBlueprintModal, setShowBlueprintModal] = useState(false);
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const handleClose = () => {
    setShowBlueprintModal(false);
    setShowImportModal(false);
    setShowCampaignModal(false);
    setShowKraftEmailModal(false);
    setShowIntroModal(false);
    setShowScheduleModal(false);
  };
const VIDEO_BASE = "https://app.pitchkraft.ai";
  return (
    <div className="mx-auto" style={{marginLeft:"-30px",marginTop:"-30px"}}>
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
            <button
              onClick={() => setShowIntroModal(true)}
              className="text-gray-600 green flex gap-2 items-center"
            >
              <FontAwesomeIcon
                icon={faPlayCircle}
                className=" text-[#3f9f42] text-[14px]"
              />
              <span>Watch 3-min intro</span>
            </button>
            {showIntroModal && (
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
                }}
              >
                <div
                  style={{
                    backgroundColor: "#fff",
                    padding: "20px",
                    borderRadius: "10px",
                    maxWidth: "800px",
                    width: "90%",
                    zIndex: 2000,
                  }}
                >
                  <button
                    onClick={handleClose}
                    style={{ float: "right", fontSize: "16px" }}
                  >
                    Close
                  </button>
                  <video width="100%" height="auto" controls autoPlay>
                    <source src={`${VIDEO_BASE}/video/Intro_video_Pitchkraft.mp4`} />
                  </video>
                </div>
              </div>
            )}
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
                    Create a blueprint
                  </div>
                   <button onClick={() => setShowBlueprintModal(true)} className=" green flex gap-2 items-center">
                    <FontAwesomeIcon
                      icon={faPlayCircle}
                      className=" text-[#3f9f42] text-[14px]"
                    />
                    <span>
                      Watch quick intro
                    </span>
                  </button>
                   {showBlueprintModal  && (
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
                        //zIndex: 1000,
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: "#fff",
                          padding: "20px",
                          borderRadius: "10px",
                          maxWidth: "800px",
                          width: "90%",
                          zIndex: 2000,
                        }}
                      >
                        <button
                          onClick={handleClose}
                          style={{ float: "right", fontSize: "16px" }}
                        >
                          Close
                        </button>
                        <video width="100%" height="auto" controls autoPlay>
                        <source src={`${VIDEO_BASE}/video/BlueprintsGuide1.mp4`} />
                        </video>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-between h-[calc(100%-30px)]">
                  <div className="flex-1 flex flex-col">
                    <div className="text-gray-500 my-6">
                      <p>Similar to a template, but so much more, a blueprint is the recipe for your campaign emails. This is the most important part of the process but only takes 10 minutes. PitchKraft will talk you through it.</p>
                    </div>
                    <button onClick={() => navigate("/main?tab=TestTemplate")} className="border-[#3f9f42] border  w-[fit-content] mt-[auto] text-[#3f9f42]  rounded-xl px-3 py-1.5  font-semibold ">
                      Create blueprint
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
                  <button onClick={() => setShowImportModal(true)} className=" green flex gap-2 items-center">
                    <FontAwesomeIcon
                      icon={faPlayCircle}
                      className=" text-[#3f9f42] text-[14px]"
                    />
                    <span>
                      Watch quick intro
                    </span>
                  </button>
                  {showImportModal && (
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
                        //zIndex: 1000,
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: "#fff",
                          padding: "20px",
                          borderRadius: "10px",
                          maxWidth: "800px",
                          width: "90%",
                          zIndex: 2000,
                        }}
                      >
                        <button
                          onClick={handleClose}
                          style={{ float: "right", fontSize: "16px" }}
                        >
                          Close
                        </button>
                        <video width="100%" height="auto" controls autoPlay>
                        <source src={`${VIDEO_BASE}/video/ImportContacts.mp4`} />
                        </video>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-between h-[calc(100%-30px)]">
                  <div className="flex-1 flex flex-col">
                    <div className="text-gray-500 my-6">
                      <p className="flex-1">Add your contacts from your CRM/Excel etc. The columns will be mapped automatically. You can also create them manually in PitchKraft. You’ll need these to send your beautifully personalized emails to.</p>
                    </div>
                    <button onClick={() => navigate("/main?tab=DataCampaigns&subtab=List")} className="border-[#3f9f42] border  w-[fit-content] mt-[auto] text-[#3f9f42]  rounded-xl px-3 py-1.5  font-semibold">
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
                  <button onClick={() => setShowCampaignModal(true)} className=" green flex gap-2 items-center">
                    <FontAwesomeIcon
                      icon={faPlayCircle}
                      className=" text-[#3f9f42] text-[14px]"
                    />
                    <span>
                      Watch quick intro
                    </span>
                  </button>
                  {showCampaignModal && (
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
                        //zIndex: 1000,
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: "#fff",
                          padding: "20px",
                          borderRadius: "10px",
                          maxWidth: "800px",
                          width: "90%",
                          zIndex: 2000,
                        }}
                      >
                        <button
                          onClick={handleClose}
                          style={{ float: "right", fontSize: "16px" }}
                        >
                          Close
                        </button>
                        {/* <video width="100%" height="auto" controls autoPlay muted={false}>
  <source src="/video/CreateCampaign.mp4" type="video/mp4" />
</video> */}
                        <video
                          width="100%"
                          height="auto"
                          controls
                          autoPlay
                          src={`${VIDEO_BASE}/video/Campaigns.mp4`}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-between h-[calc(100%-30px)]">
                  <div className="flex-1 flex flex-col">
                    <div className="text-gray-500 my-6">
                      <p className="flex-1">Connect your blueprints and contacts to form an email campaign. This takes a second.</p>
                    </div>
                    <button onClick={() => navigate("/main?tab=Campaigns")} className="border-[#3f9f42] border  w-[fit-content] mt-[auto] text-[#3f9f42]  rounded-xl px-3 py-1.5  font-semibold">
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
                    Kraft emails

                  </div>
                  <button
                    onClick={() => setShowKraftEmailModal(true)}
                    className="green flex gap-2 items-center"
                  >
                    <FontAwesomeIcon
                      icon={faPlayCircle}
                      className="text-[#3f9f42] text-[14px]"
                    />
                    <span>Watch quick intro</span>
                  </button>
                  {showKraftEmailModal && (
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
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: "#fff",
                          padding: "20px",
                          borderRadius: "10px",
                          maxWidth: "800px",
                          width: "90%",
                          zIndex: 2000,
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
                          controls
                          autoPlay
                          src={`${VIDEO_BASE}/video/KraftEmails.mp4`}
                        />
                      </div>
                    </div>
                  )}


                </div>
                <div className="flex justify-between h-[calc(100%-30px)]">
                  <div className="flex-1 flex flex-col">
                    <div className="text-gray-500 my-6">
                      <p className="flex-1">This is where the magic happens. You’ve done all the hard work now, so all you have to do is click the ‘Kraft emails' button and watch the emails being written, one-by-one, hypnotically. Prepare to be amazed.</p>
                    </div>
                    <button onClick={() => navigate("/main?tab=Output")} className="border-[#3f9f42] border  w-[fit-content] mt-[auto] text-[#3f9f42]  rounded-xl px-3 py-1.5  font-semibold">
                      Kraft emails
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

                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="green flex gap-2 items-center"
                  >
                    <FontAwesomeIcon
                      icon={faPlayCircle}
                      className="text-[#3f9f42] text-[14px]"
                    />
                    <span>Watch quick intro</span>
                  </button>
                  {showScheduleModal && (
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
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: "#fff",
                          padding: "20px",
                          borderRadius: "10px",
                          maxWidth: "800px",
                          width: "90%",
                          zIndex: 2000,
                        }}
                      >
                        <button
                          onClick={handleClose}
                          style={{ float: "right", fontSize: "16px" }}
                        >
                          Close
                        </button>
                        <video width="100%" height="auto" controls autoPlay>
                          <source src={`${VIDEO_BASE}/video/Schedule_review_campaigns.mp4`} />
                        </video>
                      </div>
                    </div>
                  )}

                </div>
                <div className="flex justify-between h-[calc(100%-30px)]">
                  <div className="flex-1 flex flex-col">
                    <div className="text-gray-500 my-6">
                      <p className="flex-1">Add email settings, use the free email deliverability tools, set sending schedules, then check analytics for opens, clicks and replies.</p>
                    </div>
                    <button onClick={() => navigate("/main?tab=Mail&mailSubTab=Schedule")} className="border-[#3f9f42] border  w-[fit-content] mt-[auto] text-[#3f9f42]  rounded-xl px-3 py-1.5  font-semibold">
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
                <button className="bg-[#3f9f42] text-white rounded-xl px-3 py-1.5  font-semibold ">
                 Coming soon
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
                  <button className="bg-gray-100 border border-gray-200 text-gray-700 rounded-xl px-2 py-1 ">
                    View
                  </button>
                  <button className="bg-white border border-gray-200 text-gray-700 rounded-xl px-2 py-1 ">
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
