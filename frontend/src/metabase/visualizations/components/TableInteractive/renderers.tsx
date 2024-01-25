import getUnicodeFlagIcon from "country-flag-icons/unicode";
import { Facebook, Twitter, Search, Mail } from "react-feather";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { Icon } from "metabase/ui";
import Link from "metabase/core/components/Link";
import * as Urls from "metabase/lib/urls";

const getVal = r => {
  const { row, column } = r;
  return row[column.idx - 1];
};

export const renderHeader = header => {
  function setNewDisplay(display: string) {
    return header.column.setCols(
      header.column.columns.map(col => {
        if (col.id === header.column.id) {
          return {
            ...col,
            forcedDisplay: display,
          };
        }
        return col;
      }),
    );
  }
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <div>{header.column.name}</div>;
      </ContextMenu.Trigger>
      <ContextMenu.Portal />
      <ContextMenu.Content
        className="bg-white bordered rounded shadowed zF relative"
        style={{ minWidth: 160 }}
      >
        <span className="h5 text-normal text-light px2">Column Settings</span>
        <ContextMenu.Item className="pb1 px1">
          <Link
            className="bg-light-hover block p1"
            style={{ lineHeight: 1 }}
            to={Urls.dataModelField(
              1,
              "1:PUBLIC",
              header.column.table_id,
              header.column.id,
            )}
            target="_blank"
          >
            Edit metadata
          </Link>
        </ContextMenu.Item>
        <ContextMenu.Item className="px1">
          <div className="px1">Pin as filter</div>
        </ContextMenu.Item>
        <ContextMenu.Separator
          style={{ height: 1, display: "block", backgroundColor: "#ddd" }}
        />
        <ContextMenu.Sub>
          <ContextMenu.SubTrigger className="px1">
            <div className="p1">Display as...</div>
          </ContextMenu.SubTrigger>
          <ContextMenu.SubContent className="bg-white bordered rounded shadowed zF">
            <ContextMenu.Item onClick={() => setNewDisplay("default")}>
              Column default
            </ContextMenu.Item>
            <ContextMenu.Item onClick={() => setNewDisplay("badge")}>
              Badge
            </ContextMenu.Item>
            <ContextMenu.Item onClick={() => setNewDisplay("plain")}>
              Plain text
            </ContextMenu.Item>
          </ContextMenu.SubContent>
        </ContextMenu.Sub>
      </ContextMenu.Content>
    </ContextMenu.Root>
  );
};

export const defaultRenderer = (row: Row) => {
  return <div>{String(getVal(row))}</div>;
};

export const badgeRenderer = (row: Row) => {
  const val = String(getVal(row));

  const hackweekValues = {
    premium: ["#6366f1", "#D7D8FF"],
    basic: ["#f59e0b", "#FFF7E9"],
    other: ["#84cc16", "#F5FFE5"],
    true: ["#22c55e", "#F5FFE5"],
    false: ["#ef4444", "#FEE2E2"],
    gizmo: ["#6366f1", "#D7D8FF"],
    gadget: ["#f59e0b", "#FFF7E9"],
    doohickey: ["#84cc16", "#F5FFE5"],
    gmail: ["#84cc16", "#F5FFE5"],
    hotmail: ["#f59e0b", "#FFF7E9"],
    yahoo: ["#6366f1", "#D7D8FF"],
    average: ["#f59e0b", "#FFF7E9"],
    good: ["#22c55e", "#F5FFE5"],
    poor: ["#ef4444", "#FEE2E2"],
    null: ["#ddd", "transparent"],
    facebook: ["#fff", "#0668E1"],
    twitter: ["#fff", "#1DA1F2"],
    invite: ["#fff", "#F59E0B"],
    google: ["#fff", "#DB4437"],
  };

  const colorGetter = val => {
    if (row.column.name === "Email") {
      const domain = val.split("@");
      const domainName = domain[1].split(".")[0];
      return domainName;
    }
    return val.toLowerCase();
  };
  const [color, bgColor] =
    hackweekValues[colorGetter(val)] || hackweekValues.other;

  return (
    <div
      className="inline-block"
      style={{
        color,
        backgroundColor: bgColor,
        borderRadius: 4,
        padding: "2px 6px",
        lineHeight: "1",
      }}
    >
      {String(val)}
    </div>
  );
};

export const emailRenderer = (row: Row) => {
  return (
    <div className="flex align-center">
      <Icon
        name="mail"
        size={12}
        className="flex-no-shrink"
        style={{ opacity: 0.3, marginRight: 4 }}
      />
      {String(getVal(row))}
    </div>
  );
};

export const sourceRenderer = (row: Row) => {
  const size = 12;
  const val = getVal(row);
  function getIcon(val: string) {
    switch (val) {
      case "Facebook":
        return <Facebook size={size} />;
      case "Twitter":
        return <Twitter size={size} />;
      case "Google":
        return <Search size={size} />;
      case "Invite":
        return <Mail size={size} />;
      default:
        return null;
    }
  }
  return (
    <div
      style={{ color: val ? "inherirt" : "#666" }}
      className="flex align-center"
    >
      {val && (
        <span className="mr1" style={{ opacity: 0.3 }}>
          {getIcon(val)}
        </span>
      )}
      {String(getVal(row))}
    </div>
  );
};

export const countryRenderer = (row: Row) => {
  const val = getVal(row);
  return (
    <>
      <span className="mr1">{getUnicodeFlagIcon(String(val))}</span>
      {String(val)}
    </>
  );
};

export const booleanRenderer = (row: Row) => {
  const val = getVal(row);

  return (
    <div>
      <div
        className="mr1"
        style={{
          display: "inline-block",
          width: 8,
          height: 8,
          borderRadius: 12,
          backgroundColor: val ? "#22c55e" : "#ef4444",
        }}
      ></div>
      {String(val)}
    </div>
  );
};

export const dateRenderer = (row: Row) => {
  return (
    <div className="flex align-center">
      <Icon
        name="calendar"
        size={12}
        className="flex-no-shrink"
        style={{ opacity: 0.3, marginRight: 4 }}
      />
      {new Date(getVal(row)).toLocaleString("en")}
    </div>
  );
};