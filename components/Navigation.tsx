import { useContext } from "react";
import { AuthenticationContext } from "@/context/authentication.context";
import { NavLink } from "react-router";

export default function Navigation() {
  const { isAuthenticated, login } = useContext(AuthenticationContext);

  const tabs = [
    { label: "Annotations", view: "/annotations" },
    { label: "About", view: "/introduction" },
    {
      label: "Login",
      view: "/login",
      onclick: login,
      hidden: isAuthenticated,
    },
    {
      label: "Settings",
      view: "/settings",
      hidden: !isAuthenticated,
    },
  ];

  return (
    <nav
      aria-label="Tabs"
      className="isolate flex divide-x divide-gray-200 bg-white shadow-sm"
    >
      {tabs.map((tab) => {
        if (tab.hidden) return null;

        return (
          <NavLink
            key={tab.label}
            to={tab.view}
            end
            onClick={(e) => {
              if (tab.onclick) {
                e.preventDefault();
                tab.onclick();
              }
            }}
            className={({ isActive }) =>
              `${
                isActive ? "text-gray-900 bg-rda-100" : "text-gray-500"
              } group relative min-w-0 flex-1 overflow-hidden px-4 py-2 text-center text-sm font-medium focus:z-10`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={
                    tab.label === "Login" ? "text-rda-500 font-medium" : ""
                  }
                >
                  {tab.label}
                </span>
                <span
                  aria-hidden="true"
                  className={`${
                    isActive ? "bg-rda-500" : "bg-transparent"
                  } absolute inset-x-0 bottom-0 h-0.5`}
                />
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
