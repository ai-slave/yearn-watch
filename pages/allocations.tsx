import React, {ReactElement, useEffect, useState} from 'react';
import {useWatch} from 'contexts/useWatch';
import SectionAllocationsList, {TProtocolsByChain} from 'components/sections/allocations/SectionAllocationsList';
import {TableHead, TableHeadCell} from 'components/TableHeadCell';
import {TRowHead} from 'contexts/useWatch.d';
import {format} from '@yearn-finance/web-lib/utils';


type		TNetworkSelector = {
	selectedChain: string,
	chainList: string[],
	set_chain: React.Dispatch<React.SetStateAction<string>>
}

/* 🔵 - Yearn Finance **********************************************************
** This will render the chain selector for table. This component asks for
*  sortBy and set_sortBy in order to handle the chevron displays and to set
** the sort based on the user's choice.
******************************************************************************/
function	NetworkSelector({selectedChain, chainList, set_chain}: TNetworkSelector): ReactElement {
	return (
		<div className={'min-w-32 col-span-8 flex flex-row items-center gap-4'}>
			{chainList?.map((chain, index): ReactElement=>(
				<div
					key={index}
					className={`text-black-600 cursor-pointer rounded-[12px] py-2 px-4 hover:bg-neutral-300 ${chain === selectedChain ? 'transition-color bg-neutral-300' : 'transition-color bg-neutral-300/50'}`}
					onClick={(): void=> set_chain(chain)}
				>
					{chain}
				</div>
			))}
		</div>
	);
}

/* 🔵 - Yearn Finance **********************************************************
** This will render the head of the fake table we have, with the sortable
** elements. This component asks for sortBy and set_sortBy in order to handle
** the chevron displays and to set the sort based on the user's choice.
******************************************************************************/
function	RowHead({sortBy, set_sortBy}: TRowHead): ReactElement {
	return (
		<TableHead sortBy={sortBy} set_sortBy={set_sortBy}>
			<TableHeadCell
				className={'cell-start min-w-32 col-span-4'}
				label={'Protocol'}
				sortId={'name'} />
			<TableHeadCell
				className={'cell-end min-w-36 col-span-5'}
				label={'Total Value Locked'}
				sortId={'tvl'} />
			<TableHeadCell
				className={'cell-end min-w-36 col-span-5'}
				label={'Strategies amount'}
				sortId={'strategiesAmount'} />
			<TableHeadCell
				className={'cell-end min-w-36 col-span-6'}
				label={'Allocated strategies amount'}
				sortId={'allocatedStrategiesAmount'} />
		</TableHead>
	);
}

const initProtocolState = {
	All: {
		list: {},
		tvlTotal: 0
	}
};

/* 🔵 - Yearn Finance **********************************************************
** Main render of the Risk page
******************************************************************************/
function	Allocations(): ReactElement {
	const	{vaultsByChain} = useWatch();
	const	[sortBy, set_sortBy] = useState('tvl');
	const	[selectedChain, set_chain] = useState('All');
	const	[protocols, set_protocols] = useState<TProtocolsByChain>(initProtocolState);
	/* 🔵 - Yearn Finance ******************************************************
	** This effect is triggered every time the vault list or the search term is
	** changed. It filters the vault list based on the search term. This action
	** takes into account the strategies too.
	** It also takes into account the router query arguments as additional
	** filters.
	**************************************************************************/


	useEffect((): void => {
		if (!vaultsByChain.length) {
			set_protocols(initProtocolState);
			return;
		}
		const protocols: TProtocolsByChain = {};
		protocols.All = {
			tvlTotal: 0,
			list: {}
		};
		vaultsByChain.forEach((chainData): void => {
			protocols[chainData.chainName] = {
				tvlTotal: 0,
				list: {}
			};
			chainData.vaults.forEach((vault): void => {
				vault.strategies.forEach((strategy): void => {
					if (strategy.details.protocols) {
						strategy.details.protocols.forEach((protocol): void => {
							const totalDebtUSDC = (
								format.toNormalizedValue(format.BN(strategy?.details?.totalDebt), vault.decimals)
								* vault.tvl.price
							);
							if (!protocols[chainData.chainName].list[protocol]) {
								protocols[chainData.chainName].list[protocol] = {
									strategiesTVL: {},
									emptyStrategies:[],
									tvl: 0,
									allocatedStrategies: 0,
									strategiesAmount: 0,
									totalDebtRatio: 0,
									name: protocol
								};
							}
							protocols[chainData.chainName].list[protocol].tvl += totalDebtUSDC;
							if(!protocols[chainData.chainName].list[protocol].strategiesTVL[strategy.name]){
								protocols[chainData.chainName].list[protocol].strategiesTVL[strategy.name] = 0;
								if(totalDebtUSDC>0) protocols[chainData.chainName].list[protocol].allocatedStrategies++;
							}
							protocols[chainData.chainName].list[protocol].strategiesTVL[strategy.name] += totalDebtUSDC;
							protocols[chainData.chainName].tvlTotal += totalDebtUSDC;

							if (!protocols.All.list[protocol]) {
								protocols.All.list[protocol] = {
									strategiesTVL: {},
									emptyStrategies:[],
									tvl: 0,
									allocatedStrategies: 0,
									strategiesAmount: 0,
									totalDebtRatio: 0,
									name: protocol
								};
							}
							protocols.All.list[protocol].tvl += totalDebtUSDC;
							if(!protocols.All.list[protocol].strategiesTVL[strategy.name]){
								protocols.All.list[protocol].strategiesTVL[strategy.name] = 0;
								if(totalDebtUSDC>0) protocols.All.list[protocol].allocatedStrategies++;
							}
							protocols.All.list[protocol].strategiesTVL[strategy.name] += totalDebtUSDC;
							protocols.All.tvlTotal += totalDebtUSDC;
						});
					}
				});
			});
			protocols[chainData.chainName].protocolsCount = Object.keys(protocols[chainData.chainName].list).length;
		});
		Object.keys(protocols).forEach((networkName): void => {
			if(protocols[networkName].list) {
				Object.keys(protocols[networkName].list).forEach((protocol): void => {
					protocols[networkName].list[protocol].strategiesAmount = Object.keys(protocols[networkName].list[protocol].strategiesTVL).length;
					Object.keys(protocols[networkName].list[protocol].strategiesTVL).forEach((strategy): void=>{
						if(protocols[networkName].list[protocol].strategiesTVL[strategy] === 0) {
							delete protocols[networkName].list[protocol].strategiesTVL[strategy];
							protocols[networkName].list[protocol].emptyStrategies.push(strategy);
						}
					});
					protocols[networkName].list[protocol].totalDebtRatio =
						protocols[networkName].list[protocol].tvl /
						protocols[networkName].tvlTotal * 100;
				});
			}
		});
		set_protocols(protocols);
	}, [vaultsByChain]);

	/* 🔵 - Yearn Finance ******************************************************
	** Main render of the page.
	**************************************************************************/
	return (
		<div className={'flex-col-full'}>
			<NetworkSelector selectedChain={selectedChain} chainList={Object.keys(protocols)} set_chain={set_chain}/>
			<div className={'mt-10 flex h-full overflow-x-scroll pb-0'}>
				<div className={'flex h-full w-[965px] flex-col md:w-full'}>
					<RowHead sortBy={sortBy} set_sortBy={set_sortBy} />
					<SectionAllocationsList sortBy={sortBy} protocols={protocols[selectedChain]} />
				</div>
			</div>
		</div>
	);
}

export default Allocations;
